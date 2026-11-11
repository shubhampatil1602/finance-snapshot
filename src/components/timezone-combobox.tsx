"use client"

import { useMemo } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import type { TimeZoneOption } from "@/lib/timezones"

function normalize(s: string) {
  return s.toLowerCase().replace(/[_/\s]+/g, " ").trim()
}

/** Everything a user might type to find a zone: city, region, old name, "+5:30", "utc+05:30". */
function haystack(o: TimeZoneOption) {
  const short = o.offset.replace(/^UTC([+-])0?(\d+):00$/, "$1$2").replace(/^UTC([+-])0?(\d+):(\d+)$/, "$1$2:$3")
  return normalize([...o.aliases, o.label, o.offset, short, `utc${short}`, `gmt${short}`].join(" | "))
}

/** Find the option for a zone name, including aliases the browser knows but the server list spells differently. */
export function findTimeZone(options: TimeZoneOption[], tz: string): TimeZoneOption | null {
  if (!tz) return null
  const direct = options.find((o) => o.aliases.includes(tz))
  if (direct) return direct
  const resolve = (z: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: z }).resolvedOptions().timeZone
    } catch {
      return null
    }
  }
  const id = resolve(tz)
  return id ? (options.find((o) => o.aliases.some((a) => resolve(a) === id)) ?? null) : null
}

export function TimeZoneCombobox({
  id,
  name,
  options,
  value,
  onValueChange,
  required,
  invalid,
}: {
  id: string
  name: string
  options: TimeZoneOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  required?: boolean
  invalid?: boolean
}) {
  const search = useMemo(() => new Map(options.map((o) => [o.value, haystack(o)])), [options])
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(o) => onValueChange(o?.value ?? null)}
      itemToStringLabel={(o) => o.label}
      itemToStringValue={(o) => o.value}
      filter={(o, query) => (search.get(o.value) ?? "").includes(normalize(query))}
      name={name}
      required={required}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Search city or offset, e.g. Kolkata or +5:30"
        className="w-full"
        aria-invalid={invalid || undefined}
      />
      <ComboboxContent>
        <ComboboxEmpty>No timezone found.</ComboboxEmpty>
        <ComboboxList>
          {(o: TimeZoneOption) => (
            <ComboboxItem key={o.value} value={o}>
              <span className="truncate">{o.label}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{o.offset}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
