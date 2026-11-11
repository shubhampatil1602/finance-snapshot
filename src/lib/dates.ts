import type { DateStr, MonthStr } from "./types"

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function isMonth(value: unknown): value is MonthStr {
  return typeof value === "string" && MONTH_RE.test(value)
}

export function isDate(value: unknown): value is DateStr {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false
  const day = Number(value.slice(8, 10))
  return day <= daysInMonth(value.slice(0, 7))
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Today's Date in the given IANA timezone — never the server clock's date. */
export function todayIn(timeZone: string, now: Date = new Date()): DateStr {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function monthOf(date: DateStr): MonthStr {
  return date.slice(0, 7)
}

function parseMonth(month: MonthStr): [number, number] {
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))]
}

function formatMonth(year: number, month: number): MonthStr {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function addMonths(month: MonthStr, delta: number): MonthStr {
  const [y, m] = parseMonth(month)
  const index = y * 12 + (m - 1) + delta
  return formatMonth(Math.floor(index / 12), (index % 12) + 1)
}

export const prevMonth = (month: MonthStr) => addMonths(month, -1)
export const nextMonth = (month: MonthStr) => addMonths(month, 1)

/** Whole months from `a` to `b` (b − a). */
export function monthDiff(a: MonthStr, b: MonthStr): number {
  const [ay, am] = parseMonth(a)
  const [by, bm] = parseMonth(b)
  return (by - ay) * 12 + (bm - am)
}

export function daysInMonth(month: MonthStr): number {
  const [y, m] = parseMonth(month)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function firstDayOf(month: MonthStr): DateStr {
  return `${month}-01`
}

export function lastDayOf(month: MonthStr): DateStr {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`
}

/** min(dueDay, last day of month) */
export function effectiveDueDate(dueDay: number, month: MonthStr): DateStr {
  const day = Math.min(dueDay, daysInMonth(month))
  return `${month}-${String(day).padStart(2, "0")}`
}

/** The current Month or the previous Month. Every older Month is locked. */
export function isEditableMonth(month: MonthStr, today: DateStr): boolean {
  const current = monthOf(today)
  return month === current || month === prevMonth(current)
}

export function formatMonthLabel(month: MonthStr, style: "long" | "short" = "long"): string {
  const [y, m] = parseMonth(month)
  return new Intl.DateTimeFormat("en-US", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)))
}

export function formatDateLabel(date: DateStr, withYear = false): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** Parse `?month=` and clamp it: invalid or future months fall back to the current month. */
export function resolveMonthParam(raw: unknown, today: DateStr): MonthStr {
  const current = monthOf(today)
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!isMonth(value)) return current
  return value > current ? current : value
}
