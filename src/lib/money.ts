export const CURRENCIES = [
  { code: "INR", locale: "en-IN", label: "Indian rupee (₹)" },
  { code: "USD", locale: "en-US", label: "US dollar ($)" },
  { code: "EUR", locale: "de-DE", label: "Euro (€)" },
  { code: "GBP", locale: "en-GB", label: "British pound (£)" },
  { code: "AUD", locale: "en-AU", label: "Australian dollar (A$)" },
  { code: "CAD", locale: "en-CA", label: "Canadian dollar (C$)" },
  { code: "SGD", locale: "en-SG", label: "Singapore dollar (S$)" },
  { code: "AED", locale: "en-AE", label: "UAE dirham (AED)" },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

export function isCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code)
}

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: string, fractionDigits: 0 | 2) {
  const key = `${currency}:${fractionDigits}`
  let fmt = formatters.get(key)
  if (!fmt) {
    const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-US"
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    formatters.set(key, fmt)
  }
  return fmt
}

/**
 * Format integer minor units (paise/cents) for display: "₹1,200" for whole
 * amounts, "₹2,450.50" otherwise. Formatting only, never conversion.
 */
export function formatMoney(minor: number, currency: string): string {
  return formatter(currency, minor % 100 === 0 ? 0 : 2).format(minor / 100)
}

/** Minor units → plain decimal string for inputs ("49950" → "499.50"). */
export function toMajorString(minor: number): string {
  const sign = minor < 0 ? "-" : ""
  const abs = Math.abs(minor)
  const major = Math.floor(abs / 100)
  const cents = abs % 100
  return cents === 0 ? `${sign}${major}` : `${sign}${major}.${String(cents).padStart(2, "0")}`
}

/**
 * Parse a user-typed amount into positive integer minor units without float maths.
 * Accepts "499", "499.5", "499.50", "1,299.00". Returns null for anything else,
 * including zero and negatives.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input !== "string") return null
  const cleaned = input.replace(/[,\s_]/g, "")
  const match = /^(\d{1,12})(?:\.(\d{0,2}))?$/.exec(cleaned)
  if (!match) return null
  const major = Number(match[1])
  const cents = Number((match[2] ?? "").padEnd(2, "0") || "0")
  const minor = major * 100 + cents
  if (!Number.isSafeInteger(minor) || minor <= 0) return null
  return minor
}
