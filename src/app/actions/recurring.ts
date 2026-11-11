"use server"

import { ObjectId } from "mongodb"
import { collections, isDuplicateKeyError } from "@/lib/db"
import { requireUserForMutation, type AuthedUser } from "@/lib/auth/dal"
import { effectiveDueDate, firstDayOf, isEditableMonth, isMonth, monthOf } from "@/lib/dates"
import { appliesTo, canMarkAlreadyPaid } from "@/lib/domain/recurring"
import {
  ActionError,
  assertCategory,
  assertPaymentMethod,
  assertRecordUnlocked,
  assertWritableDate,
  optId,
  requireAmount,
  requireId,
  requireStr,
  runAction,
  setOrUnset,
  str,
} from "@/lib/actions/helpers"
import type { ActionState, Kind, MonthStr, RecurringDoc } from "@/lib/types"

const KINDS: Kind[] = ["bill", "subscription", "emi", "mutual_fund"]

interface RecurringFields {
  name: string
  kind: Kind
  amount: number
  dueDay: number
  categoryId: ObjectId
  paymentMethodId?: ObjectId
  startMonth: MonthStr
  endMonth?: MonthStr
}

async function readRecurringFields(form: FormData, user: AuthedUser, existing?: RecurringDoc): Promise<RecurringFields> {
  const name = requireStr(form, "name", "Name", 60)
  const kind = str(form, "kind") as Kind
  if (!KINDS.includes(kind)) throw new ActionError("Choose bill, subscription, EMI or mutual fund.", "kind")
  const amount = requireAmount(form)
  const dueDay = Number(str(form, "dueDay"))
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new ActionError("Due day must be 1–31.", "dueDay")

  const startMonth = str(form, "startMonth") || monthOf(user.today)
  if (!isMonth(startMonth)) throw new ActionError("Enter a valid start month.", "startMonth")
  const endRaw = str(form, "endMonth")
  if (endRaw && !isMonth(endRaw)) throw new ActionError("Enter a valid end month.", "endMonth")
  const endMonth = endRaw || undefined
  if (kind === "emi" && !endMonth) throw new ActionError("An EMI needs an end month.", "endMonth")
  if (endMonth && endMonth < startMonth) throw new ActionError("End month can't be before the start month.", "endMonth")

  const categoryId = requireId(form, "categoryId", "Category")
  await assertCategory(user._id, categoryId, "expense", { allowArchived: existing?.categoryId.equals(categoryId) })
  const paymentMethodId = optId(form, "paymentMethodId")
  await assertPaymentMethod(user._id, paymentMethodId, {
    allowArchived: Boolean(paymentMethodId && existing?.paymentMethodId?.equals(paymentMethodId)),
  })

  return { name, kind, amount, dueDay, categoryId, paymentMethodId, startMonth, endMonth }
}

/** Paid months must stay inside [startMonth, endMonth], so history never changes. */
async function assertCoversPaidMonths(userId: ObjectId, recurringId: ObjectId, startMonth: MonthStr, endMonth?: MonthStr) {
  const { transactions } = await collections()
  const paidMonths = (await transactions.distinct("forMonth", { userId, recurringId })) as MonthStr[]
  if (paidMonths.length === 0) return
  const sorted = paidMonths.sort()
  if (startMonth > sorted[0]) throw new ActionError(`Start month can't be after a paid month (${sorted[0]}).`, "startMonth")
  const last = sorted[sorted.length - 1]
  if (endMonth && endMonth < last) throw new ActionError(`End month can't be before a paid month (${last}).`, "endMonth")
}

/** Insert the single Linked expense that marks (item, forMonth) as Paid. */
async function insertLinkedExpense(
  user: AuthedUser,
  item: RecurringDoc,
  forMonth: MonthStr,
  input: { amount: number; date: string; paymentMethodId?: ObjectId },
) {
  if (!isEditableMonth(forMonth, user.today)) throw new ActionError("That month is locked.")
  if (!appliesTo(item, forMonth)) throw new ActionError("This item doesn't apply to that month.")
  assertWritableDate(input.date, user.today)
  if (input.date < firstDayOf(forMonth)) {
    throw new ActionError("Payment date can't be before the month it pays for.", "date")
  }
  const now = new Date()
  const { transactions } = await collections()
  try {
    await transactions.insertOne({
      _id: new ObjectId(),
      userId: user._id,
      type: "expense",
      amount: input.amount,
      date: input.date,
      categoryId: item.categoryId,
      ...(input.paymentMethodId ? { paymentMethodId: input.paymentMethodId } : {}),
      recurringId: item._id,
      forMonth,
      createdAt: now,
      updatedAt: now,
    })
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new ActionError("Already marked paid for that month.")
    throw err
  }
}

export async function createRecurringAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const fields = await readRecurringFields(form, user)
    const alreadyPaid = form.get("alreadyPaid") === "on"
    const doc: RecurringDoc = {
      _id: new ObjectId(),
      userId: user._id,
      name: fields.name,
      kind: fields.kind,
      amount: fields.amount,
      dueDay: fields.dueDay,
      categoryId: fields.categoryId,
      startMonth: fields.startMonth,
      ...(fields.paymentMethodId ? { paymentMethodId: fields.paymentMethodId } : {}),
      ...(fields.endMonth ? { endMonth: fields.endMonth } : {}),
    }

    // Validate the "already paid" payment before writing anything.
    const month = monthOf(user.today)
    const paidDate = str(form, "paidDate") || effectiveDueDate(doc.dueDay, month)
    if (alreadyPaid) {
      if (!canMarkAlreadyPaid(doc, user.today)) {
        throw new ActionError("This month's due date hasn't passed yet. Use Mark paid when you pay it.")
      }
      assertWritableDate(paidDate, user.today, "paidDate")
      if (paidDate < firstDayOf(month)) throw new ActionError("Payment date must be in this month.", "paidDate")
    }

    const { recurring } = await collections()
    await recurring.insertOne(doc)
    if (alreadyPaid) {
      await insertLinkedExpense(user, doc, month, {
        amount: doc.amount,
        date: paidDate,
        paymentMethodId: doc.paymentMethodId,
      })
    }
  })
}

export async function updateRecurringAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Recurring item")
    const { recurring } = await collections()
    const existing = await recurring.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Recurring item not found.")
    const fields = await readRecurringFields(form, user, existing)
    await assertCoversPaidMonths(user._id, id, fields.startMonth, fields.endMonth)
    // Amount changes only affect unpaid months: paid months show their Linked expense's amount.
    await recurring.updateOne({ _id: id, userId: user._id }, setOrUnset({ ...fields }))
  })
}

/** End = set endMonth. The item is kept, so history is unchanged. */
export async function endRecurringAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Recurring item")
    const endMonth = str(form, "endMonth")
    if (!isMonth(endMonth)) throw new ActionError("Enter a valid end month.", "endMonth")
    const { recurring } = await collections()
    const existing = await recurring.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Recurring item not found.")
    if (endMonth < existing.startMonth) throw new ActionError("End month can't be before the start month.", "endMonth")
    await assertCoversPaidMonths(user._id, id, existing.startMonth, endMonth)
    await recurring.updateOne({ _id: id, userId: user._id }, { $set: { endMonth } })
  })
}

/** Delete only if never paid. Otherwise it must be ended. */
export async function deleteRecurringAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Recurring item")
    const { recurring, transactions } = await collections()
    const paid = await transactions.findOne({ userId: user._id, recurringId: id }, { projection: { _id: 1 } })
    if (paid) throw new ActionError("This item has been paid before. End it instead of deleting it.")
    const result = await recurring.deleteOne({ _id: id, userId: user._id })
    if (result.deletedCount === 0) throw new ActionError("Recurring item not found.")
  })
}

export async function markPaidAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "recurringId", "Recurring item")
    const forMonth = str(form, "forMonth")
    if (!isMonth(forMonth)) throw new ActionError("Invalid month.")
    const { recurring } = await collections()
    const item = await recurring.findOne({ _id: id, userId: user._id })
    if (!item) throw new ActionError("Recurring item not found.")
    const paymentMethodId = optId(form, "paymentMethodId")
    await assertPaymentMethod(user._id, paymentMethodId, {
      allowArchived: Boolean(paymentMethodId && item.paymentMethodId?.equals(paymentMethodId)),
    })
    await insertLinkedExpense(user, item, forMonth, {
      amount: requireAmount(form),
      date: str(form, "date"),
      paymentMethodId,
    })
  })
}

/** Unmark = delete that month's Linked expense. */
export async function unmarkPaidAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "recurringId", "Recurring item")
    const forMonth = str(form, "forMonth")
    if (!isMonth(forMonth) || !isEditableMonth(forMonth, user.today)) throw new ActionError("That month is locked.")
    const { transactions } = await collections()
    const linked = await transactions.findOne({ userId: user._id, recurringId: id, forMonth })
    if (!linked) throw new ActionError("This item isn't marked paid.")
    assertRecordUnlocked(linked.date, user.today)
    await transactions.deleteOne({ _id: linked._id, userId: user._id })
  })
}
