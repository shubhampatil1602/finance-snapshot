import "server-only"
import type { ObjectId } from "mongodb"
import { collections } from "../db"
import { firstDayOf, lastDayOf } from "../dates"
import { computeSnapshot, goalBalance } from "../domain/snapshot"
import type { MonthStr } from "../types"
import {
  toCategory,
  toContribution,
  toGoal,
  toPaymentMethod,
  toRecurring,
  toTransaction,
} from "./mappers"

/*
 * Every query takes the userId from the DAL (never from the client) and filters on it.
 */

const monthRange = (month: MonthStr) => ({ $gte: firstDayOf(month), $lte: lastDayOf(month) })

export async function getCategories(userId: ObjectId) {
  const { categories } = await collections()
  const docs = await categories.find({ userId }).sort({ type: 1, name: 1 }).toArray()
  return docs.map(toCategory)
}

export async function getPaymentMethods(userId: ObjectId) {
  const { paymentMethods } = await collections()
  const docs = await paymentMethods.find({ userId }).sort({ name: 1, type: 1 }).toArray()
  return docs.map(toPaymentMethod)
}

export async function getRecurringItems(userId: ObjectId) {
  const { recurring } = await collections()
  const docs = await recurring.find({ userId }).sort({ dueDay: 1, name: 1 }).toArray()
  return docs.map(toRecurring)
}

export async function getTransactionsForMonth(userId: ObjectId, month: MonthStr) {
  const { transactions } = await collections()
  const docs = await transactions
    .find({ userId, date: monthRange(month) })
    .sort({ date: -1, createdAt: -1 })
    .toArray()
  return docs.map(toTransaction)
}

export async function getSnapshot(userId: ObjectId, month: MonthStr, today: string) {
  const { transactions, contributions } = await collections()
  const [txns, contribs, recurring, linked, categories] = await Promise.all([
    getTransactionsForMonth(userId, month),
    contributions.find({ userId, date: monthRange(month) }).toArray(),
    getRecurringItems(userId),
    transactions.find({ userId, forMonth: month, recurringId: { $exists: true } }).toArray(),
    getCategories(userId),
  ])
  return {
    snapshot: computeSnapshot({
      month,
      today,
      transactions: txns,
      contributions: contribs.map(toContribution),
      recurring,
      linkedForMonth: linked.map(toTransaction),
      categories,
    }),
    categories,
  }
}

/** Ids of recurring items that have ever been paid (they can't be deleted, only ended). */
export async function getEverPaidRecurringIds(userId: ObjectId): Promise<Set<string>> {
  const { transactions } = await collections()
  const ids = await transactions.distinct("recurringId", { userId, recurringId: { $exists: true } })
  return new Set(ids.flatMap((id) => (id ? [id.toHexString()] : [])))
}

export async function getGoalsWithProgress(userId: ObjectId) {
  const { goals, contributions } = await collections()
  const [goalDocs, contribDocs] = await Promise.all([
    goals.find({ userId }).sort({ archived: 1, name: 1 }).toArray(),
    contributions.find({ userId }).sort({ date: -1, _id: -1 }).toArray(),
  ])
  const all = contribDocs.map(toContribution)
  return goalDocs.map((doc) => {
    const goal = toGoal(doc)
    const own = all.filter((c) => c.goalId === goal.id)
    return { goal, balance: goalBalance(own), contributions: own }
  })
}

export async function getUsedPaymentMethodIds(userId: ObjectId): Promise<Set<string>> {
  const { transactions, recurring } = await collections()
  const [a, b] = await Promise.all([
    transactions.distinct("paymentMethodId", { userId, paymentMethodId: { $exists: true } }),
    recurring.distinct("paymentMethodId", { userId, paymentMethodId: { $exists: true } }),
  ])
  return new Set([...a, ...b].flatMap((id) => (id ? [id.toHexString()] : [])))
}
