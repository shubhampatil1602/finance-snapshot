"use server"

import { ObjectId } from "mongodb"
import { collections } from "@/lib/db"
import { requireUserForMutation } from "@/lib/auth/dal"
import { firstDayOf, isEditableMonth } from "@/lib/dates"
import {
  ActionError,
  assertCategory,
  assertPaymentMethod,
  assertRecordUnlocked,
  assertWritableDate,
  optId,
  requireAmount,
  requireId,
  runAction,
  setOrUnset,
  str,
} from "@/lib/actions/helpers"
import type { ActionState, TransactionType } from "@/lib/types"

function readType(form: FormData): TransactionType {
  const type = str(form, "type")
  if (type !== "income" && type !== "expense") throw new ActionError("Choose income or expense.", "type")
  return type
}

function readNote(form: FormData): string | undefined {
  const note = str(form, "note")
  if (note.length > 200) throw new ActionError("Note must be at most 200 characters.", "note")
  return note || undefined
}

export async function createTransactionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const type = readType(form)
    const amount = requireAmount(form)
    const date = str(form, "date")
    assertWritableDate(date, user.today)
    const categoryId = requireId(form, "categoryId", "Category")
    await assertCategory(user._id, categoryId, type)
    const paymentMethodId = type === "expense" ? optId(form, "paymentMethodId") : undefined
    await assertPaymentMethod(user._id, paymentMethodId)

    const note = readNote(form)
    const now = new Date()
    const { transactions } = await collections()
    await transactions.insertOne({
      _id: new ObjectId(),
      userId: user._id,
      type,
      amount,
      date,
      categoryId,
      ...(paymentMethodId ? { paymentMethodId } : {}),
      ...(note ? { note } : {}),
      createdAt: now,
      updatedAt: now,
    })
  })
}

export async function updateTransactionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Transaction")
    const { transactions } = await collections()
    const existing = await transactions.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Transaction not found.")
    assertRecordUnlocked(existing.date, user.today)

    const type = readType(form)
    const amount = requireAmount(form)
    const date = str(form, "date")
    assertWritableDate(date, user.today)

    if (existing.recurringId) {
      // A Linked expense stays an expense, and stays paid for its forMonth.
      if (type !== "expense") throw new ActionError("A recurring payment must stay an expense.", "type")
      if (!existing.forMonth || !isEditableMonth(existing.forMonth, user.today)) {
        throw new ActionError("This payment is for a locked month and can't be changed.")
      }
      if (date < firstDayOf(existing.forMonth)) {
        throw new ActionError("Payment date can't be before the month it pays for.", "date")
      }
    }

    const categoryId = requireId(form, "categoryId", "Category")
    // Keeping an archived category on an existing record is fine; switching to one isn't.
    await assertCategory(user._id, categoryId, type, { allowArchived: categoryId.equals(existing.categoryId) })
    const paymentMethodId = type === "expense" ? optId(form, "paymentMethodId") : undefined
    await assertPaymentMethod(user._id, paymentMethodId, {
      allowArchived: Boolean(paymentMethodId && existing.paymentMethodId?.equals(paymentMethodId)),
    })
    const note = readNote(form)

    await transactions.updateOne({ _id: id, userId: user._id }, setOrUnset({
      type,
      amount,
      date,
      categoryId,
      updatedAt: new Date(),
      paymentMethodId,
      note,
    }))
  })
}

/** Deleting a Linked expense un-marks its Recurring item for that month. */
export async function deleteTransactionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Transaction")
    const { transactions } = await collections()
    const existing = await transactions.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Transaction not found.")
    assertRecordUnlocked(existing.date, user.today)
    if (existing.forMonth && !isEditableMonth(existing.forMonth, user.today)) {
      throw new ActionError("This payment is for a locked month and can't be removed.")
    }
    await transactions.deleteOne({ _id: id, userId: user._id })
  })
}
