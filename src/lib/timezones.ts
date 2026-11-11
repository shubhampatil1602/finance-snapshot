import "server-only"

/**
 * Timezone options, built from the server runtime's own IANA data so every
 * option is guaranteed to pass `isValidTimeZone` on submit.
 */
export type TimeZoneOption = {
  /** IANA name submitted with the form, e.g. "Asia/Kolkata". */
  value: string
  /** Display name, e.g. "Asia/Kolkata". */
  label: string
  /** Current UTC offset, e.g. "UTC+05:30". DST-aware for the moment of render. */
  offset: string
  /** Every name this zone answers to (current, legacy, runtime-canonical). */
  aliases: string[]
}

/**
 * ICU (Node, Chrome) still reports the old CLDR names for a few renamed zones.
 * We show and store the current IANA name; the old one stays a searchable alias.
 */
const RENAMED: Record<string, string> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
}

/** The runtime's canonical id for a zone ("Asia/Kolkata" → "Asia/Calcutta" on ICU), or null if invalid. */
function runtimeId(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

function offsetMinutes(timeZone: string, now: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name)
  if (!m) return 0
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+"
  const abs = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
}

function toOption(id: string, minutes: number): TimeZoneOption {
  const value = RENAMED[id] ?? id
  return {
    value,
    label: value.replaceAll("_", " "),
    offset: formatOffset(minutes),
    aliases: [...new Set([value, id])],
  }
}

/**
 * All timezones, sorted by current UTC offset then name. If `include` is a
 * valid zone that isn't in the list (e.g. "Etc/GMT+5" saved earlier), it is
 * added so an existing setting is never silently dropped.
 */
export function listTimeZones(include?: string, now: Date = new Date()): TimeZoneOption[] {
  const ids = new Set(Intl.supportedValuesOf("timeZone"))
  ids.add("UTC")
  if (include) {
    const id = runtimeId(include)
    if (id && ![...ids].some((z) => runtimeId(z) === id)) ids.add(include)
  }
  return [...ids]
    .map((id) => ({ id, minutes: offsetMinutes(id, now) }))
    .sort((a, b) => a.minutes - b.minutes || (RENAMED[a.id] ?? a.id).localeCompare(RENAMED[b.id] ?? b.id))
    .map(({ id, minutes }) => toOption(id, minutes))
}

/** The option `value` matching a stored zone, whichever of its names was saved. */
export function matchTimeZone(options: TimeZoneOption[], tz: string): string | null {
  const direct = options.find((o) => o.aliases.includes(tz))
  if (direct) return direct.value
  const id = runtimeId(tz)
  if (!id) return null
  return options.find((o) => o.aliases.some((a) => runtimeId(a) === id))?.value ?? null
}
