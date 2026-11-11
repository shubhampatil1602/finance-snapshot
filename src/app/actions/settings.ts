"use server"

import { ObjectId } from "mongodb"
import { collections } from "@/lib/db"
import { requireUserForMutation } from "@/lib/auth/dal"
import { isValidTimeZone } from "@/lib/dates"
import { isCurrency, parseAmount } from "@/lib/money"
import { ActionError, requireId, requireStr, runAction, str } from "@/lib/actions/helpers"
import type { ActionState, PaymentMethodType, TransactionType } from "@/lib/types"

/* ---------------- Profile ---------------- */

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const currency = str(form, "currency")
    const timezone = str(form, "timezone")
    if (!isCurrency(currency)) throw new ActionError("Choose a currency.", "currency")
    if (!isValidTimeZone(timezone)) throw new ActionError("Enter a valid timezone, e.g. Asia/Kolkata.", "timezone")
    const { users } = await collections()
    // Changing timezone changes what "today" is. It never moves existing records.
    await users.updateOne({ _id: user._id }, { $set: { currency, timezone } })
  })
}

/* ---------------- Categories & budgets ---------------- */

async function assertUniqueCategoryName(userId: ObjectId, type: TransactionType, name: string, excludeId?: ObjectId) {
  const { categories } = await collections()
  const clash = await categories.findOne({
    userId,
    type,
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
  if (clash) throw new ActionError("A category with that name already exists.", "name")
}

function readBudget(form: FormData): number | undefined {
  const raw = str(form, "monthlyBudget")
  if (!raw) return undefined
  const value = parseAmount(raw)
  if (value === null) throw new ActionError("Budget must be a positive amount.", "monthlyBudget")
  return value
}

export async function createCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const name = requireStr(form, "name", "Name", 40)
    const type = str(form, "type") as TransactionType
    if (type !== "income" && type !== "expense") throw new ActionError("Choose income or expense.", "type")
    await assertUniqueCategoryName(user._id, type, name)
    const monthlyBudget = type === "expense" ? readBudget(form) : undefined
    const { categories } = await collections()
    await categories.insertOne({
      _id: new ObjectId(),
      userId: user._id,
      name,
      type,
      archived: false,
      ...(monthlyBudget ? { monthlyBudget } : {}),
    })
  })
}

/** Rename and/or set the one current budget for a category. */
export async function updateCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Category")
    const name = requireStr(form, "name", "Name", 40)
    const { categories } = await collections()
    const existing = await categories.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Category not found.")
    await assertUniqueCategoryName(user._id, existing.type, name, id)
    const monthlyBudget = existing.type === "expense" ? readBudget(form) : undefined
    await categories.updateOne(
      { _id: id, userId: user._id },
      monthlyBudget ? { $set: { name, monthlyBudget } } : { $set: { name }, $unset: { monthlyBudget: "" } },
    )
  })
}

export async function setCategoryArchivedAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Category")
    const archived = str(form, "archived") === "true"
    const { categories } = await collections()
    const result = await categories.updateOne({ _id: id, userId: user._id }, { $set: { archived } })
    if (result.matchedCount === 0) throw new ActionError("Category not found.")
  })
}

/* ---------------- Payment methods ---------------- */

const PM_TYPES: PaymentMethodType[] = ["debit_card", "credit_card", "upi", "cash"]

function readPaymentMethod(form: FormData): { type: PaymentMethodType; name?: string } {
  const type = str(form, "type") as PaymentMethodType
  if (!PM_TYPES.includes(type)) throw new ActionError("Choose a type.", "type")
  const name = type === "cash" ? str(form, "name") || undefined : requireStr(form, "name", "Bank name", 40)
  return { type, name }
}

export async function createPaymentMethodAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const { type, name } = readPaymentMethod(form)
    const { paymentMethods } = await collections()
    await paymentMethods.insertOne({
      _id: new ObjectId(),
      userId: user._id,
      type,
      ...(name ? { name } : {}),
      archived: false,
    })
  })
}

/** Fix a method's type or name. Past records point at it by id, so they show the new label. */
export async function updatePaymentMethodAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Payment method")
    const { type, name } = readPaymentMethod(form)
    const { paymentMethods } = await collections()
    const result = await paymentMethods.updateOne(
      { _id: id, userId: user._id },
      name ? { $set: { type, name } } : { $set: { type }, $unset: { name: "" } },
    )
    if (result.matchedCount === 0) throw new ActionError("Payment method not found.")
  })
}

export async function setPaymentMethodArchivedAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Payment method")
    const archived = str(form, "archived") === "true"
    const { paymentMethods } = await collections()
    const result = await paymentMethods.updateOne({ _id: id, userId: user._id }, { $set: { archived } })
    if (result.matchedCount === 0) throw new ActionError("Payment method not found.")
  })
}

/** Delete only if never used on a transaction or recurring item. */
export async function deletePaymentMethodAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Payment method")
    const { paymentMethods, transactions, recurring } = await collections()
    const [usedTxn, usedRec] = await Promise.all([
      transactions.findOne({ userId: user._id, paymentMethodId: id }, { projection: { _id: 1 } }),
      recurring.findOne({ userId: user._id, paymentMethodId: id }, { projection: { _id: 1 } }),
    ])
    if (usedTxn || usedRec) throw new ActionError("This payment method has been used. Archive it instead.")
    const result = await paymentMethods.deleteOne({ _id: id, userId: user._id })
    if (result.deletedCount === 0) throw new ActionError("Payment method not found.")
  })
}
