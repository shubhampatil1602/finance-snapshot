import { effectiveDueDate, monthDiff, monthOf } from "../dates"
import type {
  Category,
  Contribution,
  DateStr,
  Kind,
  MonthStr,
  PaymentStatus,
  RecurringItem,
  Transaction,
} from "../types"
import { appliesTo, installmentInfo, paymentStatus, remainingInstallments } from "./recurring"

export interface RecurringRow {
  item: RecurringItem
  status: PaymentStatus
  dueDate: DateStr
  /** Linked expense amount when Paid, otherwise the item's amount. */
  amount: number
  linked?: Transaction
  installment?: { n: number; total: number; remainingAmount: number }
}

export interface RecurringGroup {
  kind: Kind
  rows: RecurringRow[]
  subtotal: number
}

export interface CategorySpend {
  category: Category
  spent: number
  budget?: number
  /** spent / budget, when a budget is set */
  ratio?: number
}

export interface Snapshot {
  month: MonthStr
  income: number
  /** Spending only: excludes paid mutual fund SIPs. */
  expenses: number
  /** Paid mutual fund SIPs dated in M. The money left, but it isn't spending. */
  invested: number
  unpaidRecurring: number
  deposits: number
  withdrawals: number
  saved: number
  safeToSpend: number
  recurringGroups: RecurringGroup[]
  spending: CategorySpend[]
}

export const KIND_ORDER: Kind[] = ["bill", "subscription", "emi", "mutual_fund"]

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

/**
 * The Snapshot for one Month, calculated live from records:
 *
 *   income dated in M − expenses dated in M − SIP payments dated in M
 *   − amounts of recurring items that apply to M and are not Paid
 *   − goal deposits dated in M + goal withdrawals dated in M
 *
 * `transactions` and `contributions` must be the ones dated in M.
 * `linkedForMonth` are linked expenses whose forMonth is M (their date may be later).
 *
 * A paid mutual fund SIP is stored as a linked expense, but it is reported as
 * "invested": it reduces safe-to-spend and is left out of expenses and category spending.
 */
export function computeSnapshot(input: {
  month: MonthStr
  today: DateStr
  transactions: Transaction[]
  contributions: Contribution[]
  recurring: RecurringItem[]
  linkedForMonth: Transaction[]
  categories: Category[]
}): Snapshot {
  const { month, today, transactions, contributions, recurring, linkedForMonth, categories } = input

  const inMonth = transactions.filter((t) => monthOf(t.date) === month)
  const income = sum(inMonth.filter((t) => t.type === "income").map((t) => t.amount))
  const sipIds = new Set(recurring.filter((r) => r.kind === "mutual_fund").map((r) => r.id))
  const isSip = (t: Transaction) => Boolean(t.recurringId && sipIds.has(t.recurringId))
  const outgoing = inMonth.filter((t) => t.type === "expense")
  const expenseTxns = outgoing.filter((t) => !isSip(t))
  const expenses = sum(expenseTxns.map((t) => t.amount))
  const invested = sum(outgoing.filter(isSip).map((t) => t.amount))

  const contribsInMonth = contributions.filter((c) => monthOf(c.date) === month)
  const deposits = sum(contribsInMonth.filter((c) => c.direction === "deposit").map((c) => c.amount))
  const withdrawals = sum(contribsInMonth.filter((c) => c.direction === "withdraw").map((c) => c.amount))

  const linkedByItem = new Map(
    linkedForMonth.filter((t) => t.forMonth === month && t.recurringId).map((t) => [t.recurringId!, t]),
  )

  const rows: RecurringRow[] = recurring
    .filter((item) => appliesTo(item, month))
    .map((item) => {
      const linked = linkedByItem.get(item.id)
      const status = paymentStatus(item, month, Boolean(linked), today)
      const row: RecurringRow = {
        item,
        status,
        dueDate: effectiveDueDate(item.dueDay, month),
        amount: linked ? linked.amount : item.amount,
        linked,
      }
      if (item.kind === "emi") {
        const info = installmentInfo(item, month)
        if (info) {
          row.installment = {
            ...info,
            remainingAmount: remainingInstallments(item, month, Boolean(linked)) * item.amount,
          }
        }
      }
      return row
    })
    .sort((a, b) => a.item.dueDay - b.item.dueDay || a.item.name.localeCompare(b.item.name))

  const unpaidRecurring = sum(rows.filter((r) => r.status !== "paid").map((r) => r.amount))

  const recurringGroups = KIND_ORDER.map((kind) => {
    const groupRows = rows.filter((r) => r.item.kind === kind)
    return { kind, rows: groupRows, subtotal: sum(groupRows.map((r) => r.amount)) }
  }).filter((g) => g.rows.length > 0)

  // Spent = all expenses in that category dated in M (incl. recurring payments, excl. SIPs).
  const spentByCategory = new Map<string, number>()
  for (const t of expenseTxns) {
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount)
  }
  const spending: CategorySpend[] = categories
    .filter((c) => c.type === "expense")
    .map((category) => {
      const spent = spentByCategory.get(category.id) ?? 0
      const budget = category.monthlyBudget
      return {
        category,
        spent,
        budget,
        ratio: budget ? spent / budget : undefined,
      }
    })
    // Show categories with spending or a budget; hide archived ones without spending.
    .filter((s) => s.spent > 0 || (s.budget && !s.category.archived))
    .sort((a, b) => b.spent - a.spent)

  return {
    month,
    income,
    expenses,
    invested,
    unpaidRecurring,
    deposits,
    withdrawals,
    saved: deposits - withdrawals,
    safeToSpend: income - expenses - invested - unpaidRecurring - deposits + withdrawals,
    recurringGroups,
    spending,
  }
}

export type BudgetLevel = "ok" | "warning" | "over"

/** Amber at 80%, red over 100%. */
export function budgetLevel(ratio: number): BudgetLevel {
  if (ratio > 1) return "over"
  if (ratio >= 0.8) return "warning"
  return "ok"
}

/** Goal progress = all-time deposits − withdrawals. */
export function goalBalance(contributions: Pick<Contribution, "direction" | "amount">[]): number {
  return sum(contributions.map((c) => (c.direction === "deposit" ? c.amount : -c.amount)))
}

/**
 * "₹4,000/month needed to reach by Mar": remaining ÷ months left, counting the
 * current month and the target month. Null when reached or past due.
 */
export function neededPerMonth(
  balance: number,
  target: number,
  targetDate: DateStr | undefined,
  today: DateStr,
): number | null {
  if (!targetDate || balance >= target) return null
  const monthsLeft = monthDiff(monthOf(today), monthOf(targetDate)) + 1
  if (monthsLeft <= 0) return null
  return Math.ceil((target - balance) / monthsLeft)
}
