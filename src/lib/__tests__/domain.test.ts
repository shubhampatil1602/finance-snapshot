import { describe, expect, it } from "vitest"
import {
  addMonths,
  effectiveDueDate,
  isDate,
  isEditableMonth,
  resolveMonthParam,
  todayIn,
} from "../dates"
import { parseAmount, toMajorString } from "../money"
import { appliesTo, canMarkAlreadyPaid, installmentInfo, paymentStatus } from "../domain/recurring"
import { budgetLevel, computeSnapshot, goalBalance, neededPerMonth } from "../domain/snapshot"
import type { Category, Contribution, RecurringItem, Transaction } from "../types"

const cat = (id: string, type: "income" | "expense" = "expense", monthlyBudget?: number): Category => ({
  id,
  name: id,
  type,
  monthlyBudget,
  archived: false,
})

let seq = 0
const txn = (t: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "date" | "categoryId">): Transaction => ({
  id: `t${seq++}`,
  ...t,
})

const item = (r: Partial<RecurringItem> & Pick<RecurringItem, "id" | "amount" | "dueDay">): RecurringItem => ({
  name: r.id,
  kind: "bill",
  categoryId: "Utilities",
  startMonth: "2026-01",
  ...r,
})

describe("dates", () => {
  it("lands 23:30 IST on 31 Oct in October", () => {
    // 23:30 IST = 18:00 UTC
    expect(todayIn("Asia/Kolkata", new Date("2026-10-31T18:00:00Z"))).toBe("2026-10-31")
    // …while UTC is still the same day, and a minute past midnight IST is November.
    expect(todayIn("Asia/Kolkata", new Date("2026-10-31T18:31:00Z"))).toBe("2026-11-01")
  })

  it("due day 31 is due on 28/29 Feb", () => {
    expect(effectiveDueDate(31, "2026-02")).toBe("2026-02-28")
    expect(effectiveDueDate(31, "2028-02")).toBe("2028-02-29")
    expect(effectiveDueDate(15, "2026-02")).toBe("2026-02-15")
  })

  it("only the current and previous month are editable", () => {
    expect(isEditableMonth("2026-11", "2026-11-11")).toBe(true)
    expect(isEditableMonth("2026-10", "2026-11-11")).toBe(true)
    expect(isEditableMonth("2026-09", "2026-11-11")).toBe(false)
    expect(isEditableMonth("2025-12", "2026-01-03")).toBe(true)
  })

  it("clamps the month param to the current month", () => {
    expect(resolveMonthParam("2026-12", "2026-11-11")).toBe("2026-11")
    expect(resolveMonthParam("garbage", "2026-11-11")).toBe("2026-11")
    expect(resolveMonthParam("2025-03", "2026-11-11")).toBe("2025-03")
  })

  it("adds months across years and validates dates", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12")
    expect(addMonths("2026-12", 1)).toBe("2027-01")
    expect(isDate("2026-02-30")).toBe(false)
    expect(isDate("2028-02-29")).toBe(true)
  })
})

describe("money", () => {
  it("parses amounts into integer minor units without float maths", () => {
    expect(parseAmount("499.50")).toBe(49950)
    expect(parseAmount("499.5")).toBe(49950)
    expect(parseAmount("1,299")).toBe(129900)
    expect(parseAmount("0.1")).toBe(10)
    expect(parseAmount("0")).toBeNull()
    expect(parseAmount("-5")).toBeNull()
    expect(parseAmount("1.234")).toBeNull()
    expect(parseAmount("abc")).toBeNull()
    expect(toMajorString(49950)).toBe("499.50")
    expect(toMajorString(100000)).toBe("1000")
  })
})

describe("recurring", () => {
  it("a bill created in November does not appear in October", () => {
    const bill = item({ id: "rent", amount: 100, dueDay: 5, startMonth: "2026-11" })
    expect(appliesTo(bill, "2026-10")).toBe(false)
    expect(appliesTo(bill, "2026-11")).toBe(true)
  })

  it("ending a bill in December keeps it in November and drops it in January", () => {
    const bill = item({ id: "gym", amount: 100, dueDay: 5, startMonth: "2026-06", endMonth: "2026-12" })
    expect(appliesTo(bill, "2026-11")).toBe(true)
    expect(appliesTo(bill, "2026-12")).toBe(true)
    expect(appliesTo(bill, "2027-01")).toBe(false)
  })

  it("works out Upcoming / Overdue / Paid", () => {
    const bill = { dueDay: 15 }
    expect(paymentStatus(bill, "2026-11", false, "2026-11-11")).toBe("upcoming")
    expect(paymentStatus(bill, "2026-11", false, "2026-11-15")).toBe("upcoming")
    expect(paymentStatus(bill, "2026-11", false, "2026-11-16")).toBe("overdue")
    expect(paymentStatus(bill, "2026-10", false, "2026-11-01")).toBe("overdue")
    expect(paymentStatus(bill, "2026-10", true, "2026-11-01")).toBe("paid")
  })

  it("3-month EMI shows installment 2 of 3 in its second month and is gone in its fourth", () => {
    const emi = item({ id: "phone", kind: "emi", amount: 1_000_000, dueDay: 10, startMonth: "2026-09", endMonth: "2026-11" })
    expect(installmentInfo(emi, "2026-10")).toEqual({ n: 2, total: 3 })
    expect(appliesTo(emi, "2026-12")).toBe(false)
  })

  it("offers 'already paid' only once this month's due date has passed", () => {
    expect(canMarkAlreadyPaid({ dueDay: 5, startMonth: "2026-11" }, "2026-11-11")).toBe(true)
    expect(canMarkAlreadyPaid({ dueDay: 20, startMonth: "2026-11" }, "2026-11-11")).toBe(false)
    expect(canMarkAlreadyPaid({ dueDay: 5, startMonth: "2026-12" }, "2026-11-11")).toBe(false)
  })
})

describe("snapshot", () => {
  const categories = [cat("Salary", "income"), cat("Utilities"), cat("Shopping", "expense", 1_500_000), cat("Groceries")]

  it("with no income logged, safe-to-spend is negative", () => {
    const s = computeSnapshot({
      month: "2026-11",
      today: "2026-11-11",
      transactions: [],
      contributions: [],
      recurring: [item({ id: "rent", amount: 2_000_000, dueDay: 1 })],
      linkedForMonth: [],
      categories,
    })
    expect(s.safeToSpend).toBe(-2_000_000)
  })

  it("marking a bill paid leaves safe-to-spend unchanged", () => {
    const bill = item({ id: "power", amount: 150_000, dueDay: 20 })
    const salary = txn({ type: "income", amount: 10_000_000, date: "2026-11-01", categoryId: "Salary" })
    const base = { month: "2026-11", today: "2026-11-11", contributions: [], recurring: [bill], categories }
    const before = computeSnapshot({ ...base, transactions: [salary], linkedForMonth: [] })
    const linked = txn({ type: "expense", amount: 150_000, date: "2026-11-11", categoryId: "Utilities", recurringId: "power", forMonth: "2026-11" })
    const after = computeSnapshot({ ...base, transactions: [salary, linked], linkedForMonth: [linked] })
    expect(before.safeToSpend).toBe(after.safeToSpend)
    expect(after.recurringGroups[0].rows[0].status).toBe("paid")
  })

  it("a paid SIP counts as invested, not as spending, and safe-to-spend is unchanged", () => {
    const sip = item({ id: "sip", kind: "mutual_fund", amount: 500_000, dueDay: 5, categoryId: "Groceries" })
    const salary = txn({ type: "income", amount: 10_000_000, date: "2026-11-01", categoryId: "Salary" })
    const base = { month: "2026-11", today: "2026-11-11", contributions: [], recurring: [sip], categories }
    const before = computeSnapshot({ ...base, transactions: [salary], linkedForMonth: [] })
    const paid = txn({ type: "expense", amount: 500_000, date: "2026-11-05", categoryId: "Groceries", recurringId: "sip", forMonth: "2026-11" })
    const after = computeSnapshot({ ...base, transactions: [salary, paid], linkedForMonth: [paid] })
    expect(after.invested).toBe(500_000)
    expect(after.expenses).toBe(0)
    expect(after.spending.find((s) => s.category.name === "Groceries")).toBeUndefined()
    expect(after.safeToSpend).toBe(before.safeToSpend)
  })

  it("October's bill paid on 2 Nov counts in November's expenses, not October's", () => {
    const bill = item({ id: "net", amount: 99_900, dueDay: 25 })
    const late = txn({ type: "expense", amount: 99_900, date: "2026-11-02", categoryId: "Utilities", recurringId: "net", forMonth: "2026-10" })
    const oct = computeSnapshot({
      month: "2026-10",
      today: "2026-11-11",
      transactions: [], // nothing dated in October
      contributions: [],
      recurring: [bill],
      linkedForMonth: [late],
      categories,
    })
    expect(oct.expenses).toBe(0)
    expect(oct.unpaidRecurring).toBe(0)
    expect(oct.recurringGroups[0].rows[0].linked?.date).toBe("2026-11-02")

    const nov = computeSnapshot({
      month: "2026-11",
      today: "2026-11-11",
      transactions: [late],
      contributions: [],
      recurring: [bill],
      linkedForMonth: [],
      categories,
    })
    expect(nov.expenses).toBe(99_900)
    // November's own bill is still upcoming and counted once.
    expect(nov.unpaidRecurring).toBe(99_900)
  })

  it("goal deposits reduce and withdrawals increase safe-to-spend, and never count as spending", () => {
    const contributions: Contribution[] = [
      { id: "c1", goalId: "g", direction: "deposit", amount: 500_000, date: "2026-11-02" },
      { id: "c2", goalId: "g", direction: "withdraw", amount: 200_000, date: "2026-11-05" },
    ]
    const s = computeSnapshot({
      month: "2026-11",
      today: "2026-11-11",
      transactions: [txn({ type: "income", amount: 1_000_000, date: "2026-11-01", categoryId: "Salary" })],
      contributions,
      recurring: [],
      linkedForMonth: [],
      categories,
    })
    expect(s.safeToSpend).toBe(1_000_000 - 500_000 + 200_000)
    expect(s.saved).toBe(300_000)
    expect(s.spending).toEqual([expect.objectContaining({ spent: 0, budget: 1_500_000 })])
    expect(goalBalance(contributions)).toBe(300_000)
  })

  it("a paid EMI in Shopping counts toward the Shopping budget; an unpaid one doesn't", () => {
    const emi = item({ id: "tv", kind: "emi", amount: 1_000_000, dueDay: 5, categoryId: "Shopping", endMonth: "2027-01" })
    const base = { month: "2026-11", today: "2026-11-11", contributions: [], recurring: [emi], categories }
    const unpaid = computeSnapshot({ ...base, transactions: [], linkedForMonth: [] })
    expect(unpaid.spending.find((s) => s.category.id === "Shopping")?.spent).toBe(0)
    const paid = txn({ type: "expense", amount: 1_000_000, date: "2026-11-05", categoryId: "Shopping", recurringId: "tv", forMonth: "2026-11" })
    const after = computeSnapshot({ ...base, transactions: [paid], linkedForMonth: [paid] })
    expect(after.spending.find((s) => s.category.id === "Shopping")?.spent).toBe(1_000_000)
  })

  it("hand-computed totals for a seeded month match to the paisa", () => {
    const transactions = [
      txn({ type: "income", amount: 8_500_000, date: "2026-11-01", categoryId: "Salary" }),
      txn({ type: "expense", amount: 45_050, date: "2026-11-03", categoryId: "Groceries" }),
      txn({ type: "expense", amount: 12_999, date: "2026-11-04", categoryId: "Groceries" }),
      txn({ type: "expense", amount: 2_500_000, date: "2026-11-05", categoryId: "Utilities", recurringId: "rent", forMonth: "2026-11" }),
    ]
    const s = computeSnapshot({
      month: "2026-11",
      today: "2026-11-11",
      transactions,
      contributions: [{ id: "c", goalId: "g", direction: "deposit", amount: 1_000_000, date: "2026-11-02" }],
      recurring: [
        item({ id: "rent", amount: 2_500_000, dueDay: 5 }),
        item({ id: "netflix", kind: "subscription", amount: 64_900, dueDay: 20 }),
      ],
      linkedForMonth: [transactions[3]],
      categories,
    })
    // 85,000.00 − (450.50 + 129.99 + 25,000.00) − 649.00 − 10,000.00 = 48,770.51
    expect(s.safeToSpend).toBe(4_877_051)
  })

  it("budget turns amber at 80% and red over 100%", () => {
    expect(budgetLevel(0.79)).toBe("ok")
    expect(budgetLevel(0.8)).toBe("warning")
    expect(budgetLevel(1)).toBe("warning")
    expect(budgetLevel(1.01)).toBe("over")
  })

  it("works out the per-month amount needed to reach a goal", () => {
    // 40,000 left, Nov → Feb inclusive = 4 months → 10,000/month
    expect(neededPerMonth(0, 4_000_000, "2027-02-15", "2026-11-11")).toBe(1_000_000)
    expect(neededPerMonth(4_000_000, 4_000_000, "2027-02-15", "2026-11-11")).toBeNull()
  })
})

describe("formatMoney", () => {
  it("shows paise only when there are any", async () => {
    const { formatMoney } = await import("../money")
    expect(formatMoney(3_390_050, "INR")).toBe("₹33,900.50")
    expect(formatMoney(10_000_000, "INR")).toBe("₹1,00,000")
    expect(formatMoney(-64_900, "INR")).toBe("-₹649")
  })
})
