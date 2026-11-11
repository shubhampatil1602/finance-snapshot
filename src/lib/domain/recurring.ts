import { effectiveDueDate, monthDiff, monthOf } from "../dates"
import type { DateStr, MonthStr, PaymentStatus } from "../types"

interface RecurringLike {
  startMonth: MonthStr
  endMonth?: MonthStr
  dueDay: number
  kind: string
}

/** A Recurring item applies to M only if startMonth ≤ M ≤ endMonth (no end = open-ended). */
export function appliesTo(item: Pick<RecurringLike, "startMonth" | "endMonth">, month: MonthStr): boolean {
  if (month < item.startMonth) return false
  if (item.endMonth && month > item.endMonth) return false
  return true
}

/**
 * Payment status of one item in one Month. Worked out from records each time, never stored.
 * - Paid: a Linked expense exists for (item, M)
 * - Upcoming: not paid, M is the current month and today ≤ effective due date
 * - Overdue: not paid and the due date has passed (any unpaid item in a past month)
 */
export function paymentStatus(
  item: Pick<RecurringLike, "dueDay">,
  month: MonthStr,
  isPaid: boolean,
  today: DateStr,
): PaymentStatus {
  if (isPaid) return "paid"
  const currentMonth = monthOf(today)
  if (month < currentMonth) return "overdue"
  return today <= effectiveDueDate(item.dueDay, month) ? "upcoming" : "overdue"
}

/** EMI progress for month M: "Installment n of N". */
export function installmentInfo(
  item: Pick<RecurringLike, "startMonth" | "endMonth">,
  month: MonthStr,
): { n: number; total: number } | null {
  if (!item.endMonth) return null
  return {
    n: monthDiff(item.startMonth, month) + 1,
    total: monthDiff(item.startMonth, item.endMonth) + 1,
  }
}

/** Installments still to pay counting from M (M itself counts if unpaid). */
export function remainingInstallments(
  item: Pick<RecurringLike, "startMonth" | "endMonth">,
  month: MonthStr,
  paidThisMonth: boolean,
): number {
  const info = installmentInfo(item, month)
  if (!info) return 0
  return Math.max(0, info.total - info.n + (paidThisMonth ? 0 : 1))
}

/** Show "Already paid this month" when the current month's due date has passed. */
export function canMarkAlreadyPaid(
  item: Pick<RecurringLike, "startMonth" | "endMonth" | "dueDay">,
  today: DateStr,
): boolean {
  const month = monthOf(today)
  return appliesTo(item, month) && today > effectiveDueDate(item.dueDay, month)
}
