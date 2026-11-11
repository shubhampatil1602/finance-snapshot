import type {
  Category,
  CategoryDoc,
  Contribution,
  ContributionDoc,
  Goal,
  GoalDoc,
  PaymentMethod,
  PaymentMethodDoc,
  PaymentMethodType,
  RecurringDoc,
  RecurringItem,
  Transaction,
  TransactionDoc,
} from "../types"

export const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "debit_card", label: "Debit card" },
  { value: "credit_card", label: "Credit card" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
]

export function paymentMethodLabel(type: PaymentMethodType, name?: string): string {
  const typeLabel = PAYMENT_METHOD_TYPES.find((t) => t.value === type)?.label ?? type
  return name ? `${name} · ${typeLabel}` : typeLabel
}

export const toCategory = (d: CategoryDoc): Category => ({
  id: d._id.toHexString(),
  name: d.name,
  type: d.type,
  monthlyBudget: d.monthlyBudget,
  archived: d.archived,
})

export const toPaymentMethod = (d: PaymentMethodDoc): PaymentMethod => ({
  id: d._id.toHexString(),
  type: d.type,
  name: d.name,
  archived: d.archived,
  label: paymentMethodLabel(d.type, d.name),
})

export const toTransaction = (d: TransactionDoc): Transaction => ({
  id: d._id.toHexString(),
  type: d.type,
  amount: d.amount,
  date: d.date,
  categoryId: d.categoryId.toHexString(),
  paymentMethodId: d.paymentMethodId?.toHexString(),
  note: d.note,
  recurringId: d.recurringId?.toHexString(),
  forMonth: d.forMonth,
})

export const toRecurring = (d: RecurringDoc): RecurringItem => ({
  id: d._id.toHexString(),
  name: d.name,
  kind: d.kind,
  amount: d.amount,
  dueDay: d.dueDay,
  categoryId: d.categoryId.toHexString(),
  paymentMethodId: d.paymentMethodId?.toHexString(),
  startMonth: d.startMonth,
  endMonth: d.endMonth,
})

export const toGoal = (d: GoalDoc): Goal => ({
  id: d._id.toHexString(),
  name: d.name,
  target: d.target,
  targetDate: d.targetDate,
  archived: d.archived,
})

export const toContribution = (d: ContributionDoc): Contribution => ({
  id: d._id.toHexString(),
  goalId: d.goalId.toHexString(),
  direction: d.direction,
  amount: d.amount,
  date: d.date,
})
