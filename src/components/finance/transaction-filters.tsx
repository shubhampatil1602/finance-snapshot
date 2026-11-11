"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { formatDateLabel } from "@/lib/dates"
import { SORT_LABEL, TRANSACTION_SORTS, transactionsHref, type TransactionListParams, type TransactionSort } from "@/lib/domain/transaction-list"
import type { DateStr, MonthStr } from "@/lib/types"

const ALL = "all"

const toDate = (d: DateStr) => {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(y, m - 1, day)
}

export function TransactionFilters({
  month,
  currentMonth,
  categories,
  methods,
  activeDates,
  params,
}: {
  month: MonthStr
  currentMonth: MonthStr
  /** Categories that appear in this month's transactions. */
  categories: { id: string; name: string }[]
  /** Payment methods that appear in this month's transactions. */
  methods: { id: string; label: string }[]
  /** Days in this month that have at least one transaction. */
  activeDates: DateStr[]
  params: TransactionListParams
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dateOpen, setDateOpen] = useState(false)
  const [query, setQuery] = useState(params.q ?? "")
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(debounce.current), [])

  // Any filter change goes back to page 1.
  const update = (patch: Partial<TransactionListParams>) =>
    startTransition(() => {
      router.replace(transactionsHref(month, currentMonth, { ...params, ...patch, page: 1 }), { scroll: false })
    })

  const active = new Set(activeDates)
  const search = (value: string) => {
    setQuery(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => update({ q: value.trim() || undefined }), 300)
  }

  const hasFilters = Boolean(params.q || params.category || params.method || params.date || params.sort !== "newest")
  const methodItems = [{ value: ALL, label: "All payment methods" }, ...methods.map((m) => ({ value: m.id, label: m.label }))]
  const categoryItems = [{ value: ALL, label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]
  const sortItems = TRANSACTION_SORTS.map((s) => ({ value: s, label: SORT_LABEL[s] }))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search descriptions…"
          aria-label="Search descriptions"
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) search("")
          }}
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => search("")}>
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <Select
        items={categoryItems}
        value={params.category ?? ALL}
        onValueChange={(v) => update({ category: v && v !== ALL ? v : undefined })}
      >
        <SelectTrigger className="min-w-40" aria-label="Filter by category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {methods.length > 0 && (
        <Select
          items={methodItems}
          value={params.method ?? ALL}
          onValueChange={(v) => update({ method: v && v !== ALL ? v : undefined })}
        >
          <SelectTrigger className="min-w-44" aria-label="Filter by payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {methodItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" className={params.date ? undefined : "text-muted-foreground"} aria-label="Filter by date">
              <CalendarIcon data-icon="inline-start" />
              {params.date ? formatDateLabel(params.date) : "Any date"}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            month={toDate(`${month}-01`)}
            hideNavigation
            showOutsideDays={false}
            selected={params.date ? toDate(params.date) : undefined}
            disabled={(d) => !active.has(format(d, "yyyy-MM-dd"))}
            onSelect={(d) => {
              setDateOpen(false)
              update({ date: d ? format(d, "yyyy-MM-dd") : undefined })
            }}
          />
        </PopoverContent>
      </Popover>

      <Select items={sortItems} value={params.sort} onValueChange={(v) => update({ sort: (v ?? "newest") as TransactionSort })}>
        <SelectTrigger className="min-w-44" aria-label="Sort transactions">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={() => {
            clearTimeout(debounce.current)
            setQuery("")
            update({ q: undefined, category: undefined, method: undefined, date: undefined, sort: "newest" })
          }}>
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
      )}
      {pending && <Spinner className="text-muted-foreground" />}
    </div>
  )
}
