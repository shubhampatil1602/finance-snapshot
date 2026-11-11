import "server-only"
import { unstable_rethrow } from "next/navigation"
import { refresh } from "next/cache"
import type { ObjectId } from "mongodb"
import { UnauthorizedError } from "../auth/dal"
import { collections, isDuplicateKeyError, toObjectId } from "../db"
import { isDate, isEditableMonth, monthOf } from "../dates"
import { parseAmount } from "../money"
import type { ActionState, DateStr, TransactionType } from "../types"

/** A user-facing validation failure. Its message is safe to show. */
export class ActionError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message)
  }
}

/**
 * Run a mutation, map known failures to an ActionState, refresh the client router on success.
 * Framework control flow (redirect, notFound) is re-thrown untouched.
 */
export async function runAction(fn: () => Promise<void>, opts: { refresh?: boolean } = {}): Promise<ActionState> {
  try {
    await fn()
    if (opts.refresh !== false) refresh()
    return { ok: true, at: Date.now() }
  } catch (err) {
    unstable_rethrow(err)
    if (err instanceof ActionError) {
      return { ok: false, error: err.message, fieldErrors: err.field ? { [err.field]: err.message } : undefined }
    }
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message }
    if (isDuplicateKeyError(err)) return { ok: false, error: "That already exists." }
    console.error("Action failed:", err instanceof Error ? err.message : "unknown error")
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

/* ---------------- FormData readers ---------------- */

export function str(form: FormData, key: string): string {
  const v = form.get(key)
  return typeof v === "string" ? v.trim() : ""
}

export function optStr(form: FormData, key: string): string | undefined {
  return str(form, key) || undefined
}

export function requireStr(form: FormData, key: string, label: string, max = 100): string {
  const v = str(form, key)
  if (!v) throw new ActionError(`${label} is required.`, key)
  if (v.length > max) throw new ActionError(`${label} must be at most ${max} characters.`, key)
  return v
}

export function requireAmount(form: FormData, key = "amount", label = "Amount"): number {
  const amount = parseAmount(str(form, key))
  if (amount === null) throw new ActionError(`${label} must be a positive number with up to 2 decimals.`, key)
  return amount
}

export function requireId(form: FormData, key: string, label = "Item"): ObjectId {
  const id = toObjectId(str(form, key))
  if (!id) throw new ActionError(`${label} not found.`)
  return id
}

export function optId(form: FormData, key: string): ObjectId | undefined {
  const raw = str(form, key)
  if (!raw) return undefined
  const id = toObjectId(raw)
  if (!id) throw new ActionError("Invalid selection.", key)
  return id
}

/** Build a Mongo update: defined values go to $set, undefined ones to $unset (never empty operators). */
export function setOrUnset(fields: Record<string, unknown>) {
  const $set: Record<string, unknown> = {}
  const $unset: Record<string, ""> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) $unset[key] = ""
    else $set[key] = value
  }
  return {
    ...(Object.keys($set).length ? { $set } : {}),
    ...(Object.keys($unset).length ? { $unset } : {}),
  }
}

/* ---------------- Date & lock rules ---------------- */

/** Date must be a real date, ≤ Today, inside an Editable month. */
export function assertWritableDate(date: string, today: DateStr, field = "date"): asserts date is DateStr {
  if (!isDate(date)) throw new ActionError("Enter a valid date.", field)
  if (date > today) throw new ActionError("Date can't be in the future.", field)
  if (!isEditableMonth(monthOf(date), today)) {
    throw new ActionError("That month is locked. Only this month and last month can be changed.", field)
  }
}

/** For edits/deletes of an existing record: its current date must also be in an Editable month. */
export function assertRecordUnlocked(date: DateStr, today: DateStr) {
  if (!isEditableMonth(monthOf(date), today)) {
    throw new ActionError("This record is in a locked month and can't be changed.")
  }
}

/* ---------------- Ownership checks ---------------- */

export async function assertCategory(
  userId: ObjectId,
  categoryId: ObjectId,
  type: TransactionType,
  opts: { allowArchived?: boolean } = {},
) {
  const { categories } = await collections()
  const category = await categories.findOne({ _id: categoryId, userId })
  if (!category) throw new ActionError("Choose a category.", "categoryId")
  if (category.type !== type) throw new ActionError(`Choose an ${type} category.`, "categoryId")
  if (category.archived && !opts.allowArchived) {
    throw new ActionError("That category is archived.", "categoryId")
  }
  return category
}

export async function assertPaymentMethod(
  userId: ObjectId,
  paymentMethodId: ObjectId | undefined,
  opts: { allowArchived?: boolean } = {},
) {
  if (!paymentMethodId) return undefined
  const { paymentMethods } = await collections()
  const method = await paymentMethods.findOne({ _id: paymentMethodId, userId })
  if (!method) throw new ActionError("Choose a payment method.", "paymentMethodId")
  if (method.archived && !opts.allowArchived) {
    throw new ActionError("That payment method is archived.", "paymentMethodId")
  }
  return method
}
