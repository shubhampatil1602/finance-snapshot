import { getCurrentUser } from "@/lib/auth/dal"
import { collections } from "@/lib/db"
import {
  toCategory,
  toContribution,
  toGoal,
  toPaymentMethod,
  toRecurring,
  toTransaction,
} from "@/lib/data/mappers"

/** JSON export of all the user's data. Never includes the password hash or signature. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const userId = user._id
  const c = await collections()
  const [categories, paymentMethods, recurring, transactions, goals, contributions] = await Promise.all([
    c.categories.find({ userId }).toArray(),
    c.paymentMethods.find({ userId }).toArray(),
    c.recurring.find({ userId }).toArray(),
    c.transactions.find({ userId }).sort({ date: 1 }).toArray(),
    c.goals.find({ userId }).toArray(),
    c.contributions.find({ userId }).sort({ date: 1 }).toArray(),
  ])

  const body = {
    format: "finance-snapshot/v1",
    exportedAt: new Date().toISOString(),
    note: "All amounts are integer minor units (paise/cents).",
    user: { username: user.username, timezone: user.timezone, currency: user.currency },
    categories: categories.map(toCategory),
    paymentMethods: paymentMethods.map(toPaymentMethod),
    recurring: recurring.map(toRecurring),
    transactions: transactions.map(toTransaction),
    goals: goals.map(toGoal),
    contributions: contributions.map(toContribution),
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-snapshot-${user.today}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
