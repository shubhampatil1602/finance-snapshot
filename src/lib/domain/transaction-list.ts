import { isDate, monthOf } from "../dates"
import type { DateStr, MonthStr, Transaction } from "../types"

export const TRANSACTION_SORTS = ["newest", "oldest", "amount-desc", "amount-asc"] as const
export type TransactionSort = (typeof TRANSACTION_SORTS)[number]

export const SORT_LABEL: Record<TransactionSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "amount-desc": "Amount: high to low",
  "amount-asc": "Amount: low to high",
}

export const PAGE_SIZE = 50

export interface TransactionListParams {
  /** Free-text search over the note. */
  q?: string
  category?: string
  method?: string
  /** Inclusive date range; either end may be open. */
  from?: DateStr
  to?: DateStr
  sort: TransactionSort
  page: number
}

const first = (raw: unknown) => (Array.isArray(raw) ? raw[0] : raw)

/** Parse `?category=&from=&to=&sort=&page=`, dropping anything invalid for this month. */
export function parseTransactionListParams(
  raw: Record<string, string | string[] | undefined>,
  month: MonthStr,
  known: { categoryIds: ReadonlySet<string>; methodIds: ReadonlySet<string> },
): TransactionListParams {
  const q = first(raw.q)
  const category = first(raw.category)
  const method = first(raw.method)
  const inMonth = (d: unknown): d is DateStr => isDate(d) && monthOf(d) === month
  let from = first(raw.from)
  let to = first(raw.to)
  from = inMonth(from) ? from : undefined
  to = inMonth(to) ? to : undefined
  // Accept a reversed range rather than showing nothing.
  if (from && to && from > to) [from, to] = [to, from]
  const sort = first(raw.sort)
  const page = Number(first(raw.page))
  return {
    q: typeof q === "string" && q.trim() ? q.trim().slice(0, 100) : undefined,
    category: typeof category === "string" && known.categoryIds.has(category) ? category : undefined,
    method: typeof method === "string" && known.methodIds.has(method) ? method : undefined,
    from,
    to,
    sort: TRANSACTION_SORTS.includes(sort as TransactionSort) ? (sort as TransactionSort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** Filter + sort + paginate. Input is expected newest-first (as the query returns it). */
export function listTransactions(transactions: Transaction[], params: TransactionListParams) {
  const needle = params.q?.toLowerCase()
  const filtered = transactions.filter(
    (t) =>
      (!params.category || t.categoryId === params.category) &&
      (!params.method || t.paymentMethodId === params.method) &&
      (!params.from || t.date >= params.from) &&
      (!params.to || t.date <= params.to) &&
      (!needle || (t.note?.toLowerCase().includes(needle) ?? false)),
  )
  const sorted =
    params.sort === "oldest"
      ? filtered.toReversed()
      : params.sort === "amount-desc"
        ? filtered.toSorted((a, b) => b.amount - a.amount)
        : params.sort === "amount-asc"
          ? filtered.toSorted((a, b) => a.amount - b.amount)
          : filtered

  // Totals cover every match, not just the current page.
  let spent = 0
  let income = 0
  for (const t of filtered) {
    if (t.type === "income") income += t.amount
    else spent += t.amount
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  const start = (page - 1) * PAGE_SIZE
  return {
    rows: sorted.slice(start, start + PAGE_SIZE),
    total: sorted.length,
    spent,
    income,
    page,
    pageCount,
    start,
  }
}

/** Page numbers to show, with `null` for an ellipsis gap: 1 … 4 5 6 … 10 */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}

/**
 * `pageWindow` with a React key per entry. A gap is keyed by the page it follows
 * ("gap-after-1"), so its key names a fixed spot in the window, not an array slot.
 */
export function pageWindowItems(page: number, pageCount: number): { key: string; page: number | null }[] {
  const items: { key: string; page: number | null }[] = []
  for (const p of pageWindow(page, pageCount)) {
    items.push({ key: p === null ? `gap-after-${items.at(-1)?.page}` : `page-${p}`, page: p })
  }
  return items
}

/** `/transactions?…` for the given month + params, omitting defaults so URLs stay clean. */
export function transactionsHref(
  month: MonthStr,
  currentMonth: MonthStr,
  params: Partial<TransactionListParams>,
): string {
  const qs = new URLSearchParams()
  if (month !== currentMonth) qs.set("month", month)
  if (params.q) qs.set("q", params.q)
  if (params.category) qs.set("category", params.category)
  if (params.method) qs.set("method", params.method)
  if (params.from) qs.set("from", params.from)
  if (params.to) qs.set("to", params.to)
  if (params.sort && params.sort !== "newest") qs.set("sort", params.sort)
  if (params.page && params.page > 1) qs.set("page", String(params.page))
  const query = qs.toString()
  return query ? `/transactions?${query}` : "/transactions"
}
