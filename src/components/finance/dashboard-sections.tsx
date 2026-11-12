import Link from "next/link"
import { CheckIcon, PlusIcon, RepeatIcon, TargetIcon, Undo2Icon } from "lucide-react"
import { unmarkPaidAction } from "@/app/actions/recurring"
import { ActionButton } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { formatDateLabel, formatMonthLabel, isEditableMonth } from "@/lib/dates"
import { budgetLevel, neededPerMonth, type CategorySpend, type RecurringGroup, type Snapshot } from "@/lib/domain/snapshot"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Contribution, DateStr, Goal, PaymentMethod } from "@/lib/types"
import { KIND_LABEL, Money, StatusBadge } from "./display"
import { MarkPaidDialog } from "./recurring-dialogs"

export function SafeToSpendCard({ snapshot, currency, locked }: { snapshot: Snapshot; currency: string; locked: boolean }) {
  const negative = snapshot.safeToSpend < 0
  // Income and expenses always show; the rest only when they moved the number.
  const lines = [
    { label: "Income", value: snapshot.income, sign: "", always: true },
    { label: "Expenses", value: snapshot.expenses, sign: "−", always: true },
    { label: "Invested (SIPs)", value: snapshot.invested, sign: "−" },
    { label: "Unpaid recurring", value: snapshot.unpaidRecurring, sign: "−" },
    { label: "Saved to goals", value: snapshot.deposits, sign: "−" },
    { label: "Withdrawn from goals", value: snapshot.withdrawals, sign: "+" },
  ].filter((l) => l.always || l.value !== 0)
  return (
    <Card className="gap-5">
      <CardHeader className="gap-2">
        <CardDescription className="font-medium">Safe to spend · {formatMonthLabel(snapshot.month)}</CardDescription>
        <CardTitle
          className={cn(
            "font-heading text-5xl leading-none font-semibold tracking-tighter tabular-nums sm:text-6xl",
            negative && "text-destructive",
          )}
          aria-live="polite"
        >
          {formatMoney(snapshot.safeToSpend, currency)}
        </CardTitle>
        {negative && !locked && (
          <p className="text-sm text-destructive">
            {snapshot.income === 0 ? "No income logged yet this month. Add your salary when it lands." : "You've committed more than you've earned this month."}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{l.label}</dt>
              <dd className="tabular-nums">
                {l.sign && <span className="mr-0.5 text-muted-foreground">{l.sign}</span>}
                {formatMoney(l.value, currency)}
              </dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-4 border-t pt-2 font-medium">
            <dt>Safe to spend</dt>
            <dd className={cn("tabular-nums", negative && "text-destructive")}>{formatMoney(snapshot.safeToSpend, currency)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

export function TotalsRow({ snapshot, currency }: { snapshot: Snapshot; currency: string }) {
  const items = [
    { label: "Income", value: snapshot.income },
    { label: "Expenses", value: snapshot.expenses },
    { label: "Invested", value: snapshot.invested },
    { label: "Saved", value: snapshot.saved, hint: "Deposits − withdrawals" },
  ]
  return (
    <Card size="sm" className="py-0">
      {/* 1px gaps over a border-coloured backdrop draw the dividers at every breakpoint. */}
      <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3" title={i.hint}>
            <dt className="text-xs font-medium text-muted-foreground">{i.label}</dt>
            <dd className="truncate text-base font-semibold tracking-tight sm:text-lg">{formatMoney(i.value, currency)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export function RecurringCard({
  groups,
  month,
  today,
  currency,
  paymentMethods,
}: {
  groups: RecurringGroup[]
  month: string
  today: DateStr
  currency: string
  paymentMethods: PaymentMethod[]
}) {
  const editable = isEditableMonth(month, today)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring this month</CardTitle>
        <CardDescription>Unpaid items count against safe-to-spend.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/recurring" />} nativeButton={false}>
            Manage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RepeatIcon />
              </EmptyMedia>
              <EmptyTitle>No recurring items</EmptyTitle>
              <EmptyDescription>Add rent, bills, subscriptions and EMIs so they&apos;re set aside automatically.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" variant="outline" render={<Link href="/recurring" />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                Add recurring item
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.kind} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{KIND_LABEL[group.kind]}</h3>
                  <Money amount={group.subtotal} currency={currency} className="text-muted-foreground" />
                </div>
                <ul className="flex flex-col divide-y rounded-lg border">
                  {group.rows.map((row) => (
                    <li key={row.item.id} className="flex flex-col gap-2 px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-3 data-[status=paid]:bg-muted/30" data-status={row.status}>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{row.item.name}</span>
                        <span className={cn("text-xs text-muted-foreground", row.status === "overdue" && "text-destructive/80")}>
                          {row.linked ? `Paid on ${formatDateLabel(row.linked.date)}` : `Due ${formatDateLabel(row.dueDate)}`}
                          {row.installment &&
                            ` · Installment ${row.installment.n} of ${row.installment.total} · ${formatMoney(row.installment.remainingAmount, currency)} remaining`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                      <StatusBadge status={row.status} />
                      <Money
                        amount={row.amount}
                        currency={currency}
                        className={cn(
                          "ml-auto text-right text-sm font-medium sm:w-24",
                          row.status === "overdue" && "text-destructive",
                          row.status === "paid" && "font-normal text-muted-foreground",
                        )}
                      />
                      {editable &&
                        (row.linked ? (
                          <ActionButton
                            action={unmarkPaidAction}
                            fields={{ recurringId: row.item.id, forMonth: month }}
                            variant="ghost"
                            size="sm"
                            successMessage={`${row.item.name} unmarked`}
                            confirm={{
                              title: `Unmark ${row.item.name}?`,
                              description: "This deletes the linked expense. The item goes back to unpaid.",
                              actionLabel: "Unmark",
                            }}
                          >
                            <Undo2Icon data-icon="inline-start" />
                            Unmark
                          </ActionButton>
                        ) : (
                          <MarkPaidDialog
                            item={row.item}
                            forMonth={month}
                            amount={row.amount}
                            today={today}
                            paymentMethods={paymentMethods}
                            trigger={
                              <Button variant="outline" size="sm">
                                <CheckIcon data-icon="inline-start" />
                                Mark paid
                              </Button>
                            }
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SpendingCard({ spending, currency }: { spending: CategorySpend[]; currency: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>Includes paid bills, subscriptions and EMIs. SIPs and goal savings aren&apos;t spending.</CardDescription>
      </CardHeader>
      <CardContent>
        {spending.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing spent yet this month. Expenses you log show up here by category.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {spending.map((s) => {
              const level = s.ratio !== undefined ? budgetLevel(s.ratio) : undefined
              return (
                <li key={s.category.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{s.category.name}</span>
                    <span className={cn("shrink-0 tabular-nums", level === "over" && "text-destructive")}>
                      {formatMoney(s.spent, currency)}
                      {s.budget !== undefined && <span className="text-muted-foreground"> / {formatMoney(s.budget, currency)}</span>}
                    </span>
                  </div>
                  {s.ratio !== undefined && (
                    <Progress
                      value={Math.min(100, Math.round(s.ratio * 100))}
                      aria-label={`${s.category.name} budget used`}
                      className={cn(
                        level === "warning" && "[&_[data-slot=progress-indicator]]:bg-warning",
                        level === "over" && "[&_[data-slot=progress-indicator]]:bg-destructive",
                      )}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function GoalsCard({
  goals,
  currency,
  today,
}: {
  goals: { goal: Goal; balance: number; contributions: Contribution[] }[]
  currency: string
  today: DateStr
}) {
  const visible = goals.filter((g) => !g.goal.archived)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings goals</CardTitle>
        <CardDescription>All-time progress.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/goals" />} nativeButton={false}>
            Manage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TargetIcon />
              </EmptyMedia>
              <EmptyTitle>No goals yet</EmptyTitle>
              <EmptyDescription>Set money aside for something and it stops counting as spendable.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" variant="outline" render={<Link href="/goals" />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                Create a goal
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {visible.map(({ goal, balance }, i) => (
              <li key={goal.id} className="flex flex-col gap-1.5">
                {i > 0 && <Separator className="mb-2.5" />}
                <GoalProgress goal={goal} balance={balance} currency={currency} today={today} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function GoalProgress({ goal, balance, currency, today }: { goal: Goal; balance: number; currency: string; today: DateStr }) {
  const reached = balance >= goal.target
  const pct = goal.target > 0 ? Math.round((balance / goal.target) * 100) : 0
  const perMonth = neededPerMonth(balance, goal.target, goal.targetDate, today)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{goal.name}</span>
          {reached && <Badge className="bg-success/15 text-success">Reached</Badge>}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatMoney(balance, currency)}
          <span className="text-muted-foreground"> / {formatMoney(goal.target, currency)}</span>
        </span>
      </div>
      <Progress
        value={Math.min(100, pct)}
        aria-label={`${goal.name} progress`}
        className={cn(reached && "[&_[data-slot=progress-indicator]]:bg-success")}
      />
      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{pct}%</span>
        {perMonth !== null && goal.targetDate && (
          <span>
            {formatMoney(perMonth, currency)}/month needed to reach by {formatDateLabel(goal.targetDate, true)}
          </span>
        )}
      </div>
    </div>
  )
}
