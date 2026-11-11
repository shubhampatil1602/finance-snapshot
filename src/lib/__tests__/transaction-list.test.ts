import { describe, expect, it } from "vitest"
import { listTransactions, pageWindow, pageWindowItems, parseTransactionListParams, PAGE_SIZE } from "../domain/transaction-list"
import type { Transaction } from "../types"

const tx = (id: string, date: string, amount: number, categoryId = "food", extra: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount,
  date,
  categoryId,
  ...extra,
})

// Newest first, as the query returns them.
const rows = [
  tx("a", "2026-11-10", 50, "food", { note: "Vada Pav & samosa", paymentMethodId: "upi" }),
  tx("b", "2026-11-08", 500, "rent", { paymentMethodId: "card" }),
  tx("c", "2026-11-08", 5),
  tx("d", "2026-11-01", 100),
]

describe("parseTransactionListParams", () => {
  const known = { categoryIds: new Set(["food", "rent"]), methodIds: new Set(["upi"]) }

  it("accepts valid params", () => {
    expect(parseTransactionListParams({ q: "  pav ", category: "rent", method: "upi", date: "2026-11-08", sort: "amount-asc", page: "2" }, "2026-11", known)).toEqual({
      q: "pav",
      category: "rent",
      method: "upi",
      date: "2026-11-08",
      sort: "amount-asc",
      page: 2,
    })
  })

  it("drops unknown categories, dates outside the month and junk", () => {
    expect(parseTransactionListParams({ q: "   ", category: "nope", method: "x", date: "2026-10-08", sort: "x", page: "-3" }, "2026-11", known)).toEqual({
      q: undefined,
      category: undefined,
      method: undefined,
      date: undefined,
      sort: "newest",
      page: 1,
    })
  })
})

describe("listTransactions", () => {
  const base = { sort: "newest" as const, page: 1 }

  it("filters by category and date", () => {
    expect(listTransactions(rows, { ...base, category: "food" }).rows.map((t) => t.id)).toEqual(["a", "c", "d"])
    expect(listTransactions(rows, { ...base, date: "2026-11-08" }).rows.map((t) => t.id)).toEqual(["b", "c"])
  })

  it("searches the note case-insensitively and filters by payment method", () => {
    expect(listTransactions(rows, { ...base, q: "PAV" }).rows.map((t) => t.id)).toEqual(["a"])
    expect(listTransactions(rows, { ...base, method: "card" }).rows.map((t) => t.id)).toEqual(["b"])
  })

  it("sorts", () => {
    expect(listTransactions(rows, { ...base, sort: "oldest" }).rows.map((t) => t.id)).toEqual(["d", "c", "b", "a"])
    expect(listTransactions(rows, { ...base, sort: "amount-asc" }).rows.map((t) => t.id)).toEqual(["c", "a", "d", "b"])
    expect(listTransactions(rows, { ...base, sort: "amount-desc" }).rows.map((t) => t.id)).toEqual(["b", "d", "a", "c"])
  })

  it("paginates and clamps the page", () => {
    const many = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => tx(String(i), "2026-11-01", i))
    const p2 = listTransactions(many, { ...base, page: 2 })
    expect(p2).toMatchObject({ page: 2, pageCount: 2, total: PAGE_SIZE + 3, start: PAGE_SIZE })
    expect(p2.rows).toHaveLength(3)
    expect(listTransactions(many, { ...base, page: 99 }).page).toBe(2)
  })
})

describe("pageWindow", () => {
  it("shows everything for few pages", () => expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]))
  it("adds gaps for many pages", () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10])
  })
})

describe("pageWindowItems", () => {
  it("keys pages by number and gaps by the page before them", () => {
    expect(pageWindowItems(5, 10).map((item) => item.key)).toEqual([
      "page-1", "gap-after-1", "page-4", "page-5", "page-6", "gap-after-6", "page-10",
    ])
  })
})
