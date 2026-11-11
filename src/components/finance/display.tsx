import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMonthLabel, nextMonth, prevMonth } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { MonthStr, PaymentStatus } from "@/lib/types"

export function Money({
  amount,
  currency,
  className,
  signed,
}: {
  amount: number
  currency: string
  className?: string
  /** Prefix + for positives (used for income rows). */
  signed?: boolean
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {signed && amount > 0 ? "+" : ""}
      {formatMoney(amount, currency)}
    </span>
  )
}

export function PageHeader({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2">
      <div className="flex max-w-prose flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

/** ‹ prev / next ›. Next stops at the current month. */
export function MonthSwitcher({
  month,
  currentMonth,
  basePath,
  locked,
}: {
  month: MonthStr
  currentMonth: MonthStr
  basePath: string
  locked?: boolean
}) {
  const atCurrent = month >= currentMonth
  const href = (m: MonthStr) => (m === currentMonth ? basePath : `${basePath}?month=${m}`)
  return (
    <div className="flex items-center gap-2">
      <nav aria-label="Month" className="flex items-center rounded-lg border bg-background p-0.5 dark:bg-input/30">
        <Button variant="ghost" size="icon-sm" render={<Link href={href(prevMonth(month))} aria-label="Previous month" />} nativeButton={false}>
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-32 px-1 text-center text-sm font-medium tabular-nums">{formatMonthLabel(month)}</span>
        {atCurrent ? (
          <Button variant="ghost" size="icon-sm" disabled aria-label="Next month">
            <ChevronRightIcon />
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" render={<Link href={href(nextMonth(month))} aria-label="Next month" />} nativeButton={false}>
            <ChevronRightIcon />
          </Button>
        )}
      </nav>
      {locked && (
        <Badge variant="secondary">
          <LockIcon data-icon="inline-start" />
          Locked
        </Badge>
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") return <Badge className="bg-success/15 text-success">Paid</Badge>
  if (status === "overdue") return <Badge variant="destructive">Overdue</Badge>
  return <Badge variant="outline">Upcoming</Badge>
}

export const KIND_LABEL = { bill: "Bills", subscription: "Subscriptions", emi: "EMIs", mutual_fund: "Mutual funds" } as const
export const KIND_SINGULAR = { bill: "Bill", subscription: "Subscription", emi: "EMI", mutual_fund: "Mutual fund" } as const
