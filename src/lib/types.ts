import type { ObjectId } from "mongodb"

/** `YYYY-MM-DD` */
export type DateStr = string
/** `YYYY-MM` */
export type MonthStr = string

export type TransactionType = "income" | "expense"
export type Kind = "bill" | "subscription" | "emi" | "mutual_fund"
export type PaymentMethodType = "debit_card" | "credit_card" | "upi" | "cash"
export type ContributionDirection = "deposit" | "withdraw"
export type PaymentStatus = "paid" | "upcoming" | "overdue"

export interface UserDoc {
  _id: ObjectId
  username: string
  passwordHash: string
  signatureEnc: string
  timezone: string
  currency: string
  createdAt: Date
}

export interface SessionDoc {
  /** sha256 of the cookie token, so a DB leak can't be replayed as cookies. */
  _id: string
  userId: ObjectId
  expiresAt: Date
}

export interface PaymentMethodDoc {
  _id: ObjectId
  userId: ObjectId
  type: PaymentMethodType
  name?: string
  archived: boolean
}

export interface CategoryDoc {
  _id: ObjectId
  userId: ObjectId
  name: string
  type: TransactionType
  monthlyBudget?: number
  archived: boolean
}

export interface RecurringDoc {
  _id: ObjectId
  userId: ObjectId
  name: string
  kind: Kind
  amount: number
  dueDay: number
  categoryId: ObjectId
  paymentMethodId?: ObjectId
  startMonth: MonthStr
  endMonth?: MonthStr
}

export interface TransactionDoc {
  _id: ObjectId
  userId: ObjectId
  type: TransactionType
  amount: number
  date: DateStr
  categoryId: ObjectId
  paymentMethodId?: ObjectId
  note?: string
  recurringId?: ObjectId
  forMonth?: MonthStr
  createdAt: Date
  updatedAt: Date
}

export interface GoalDoc {
  _id: ObjectId
  userId: ObjectId
  name: string
  target: number
  targetDate?: DateStr
  archived: boolean
}

export interface ContributionDoc {
  _id: ObjectId
  userId: ObjectId
  goalId: ObjectId
  direction: ContributionDirection
  amount: number
  date: DateStr
}

export interface RateLimitDoc {
  _id?: ObjectId
  key: string
  at: Date
}

/* ---------- Plain, serializable shapes passed to components ---------- */

export interface CurrentUser {
  id: string
  username: string
  timezone: string
  currency: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  monthlyBudget?: number
  archived: boolean
}

export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  name?: string
  archived: boolean
  label: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: DateStr
  categoryId: string
  paymentMethodId?: string
  note?: string
  recurringId?: string
  forMonth?: MonthStr
}

export interface RecurringItem {
  id: string
  name: string
  kind: Kind
  amount: number
  dueDay: number
  categoryId: string
  paymentMethodId?: string
  startMonth: MonthStr
  endMonth?: MonthStr
}

export interface Goal {
  id: string
  name: string
  target: number
  targetDate?: DateStr
  archived: boolean
}

export interface Contribution {
  id: string
  goalId: string
  direction: ContributionDirection
  amount: number
  date: DateStr
}

export type ActionState = {
  ok?: boolean
  error?: string
  fieldErrors?: Record<string, string | undefined>
  /** Bumped on every success so client forms can reset/close. */
  at?: number
}
