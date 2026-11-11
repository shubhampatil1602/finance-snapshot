import { Suspense } from "react"
import type { Metadata } from "next"
import { CalendarOffIcon, PencilIcon, PlusIcon, RepeatIcon, Trash2Icon } from "lucide-react"
import { deleteRecurringAction } from "@/app/actions/recurring"
import { ActionButton } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { KIND_LABEL, KIND_SINGULAR, Money, PageHeader } from "@/components/finance/display"
import { EndRecurringDialog, RecurringDialog } from "@/components/finance/recurring-dialogs"
import { ListSkeleton } from "@/components/finance/skeletons"
import { requireUser } from "@/lib/auth/dal"
import { getCategories, getEverPaidRecurringIds, getPaymentMethods, getRecurringItems } from "@/lib/data/queries"
import { formatMonthLabel, monthOf } from "@/lib/dates"
import { KIND_ORDER } from "@/lib/domain/snapshot"
import type { RecurringItem } from "@/lib/types"

export const metadata: Metadata = { title: "Recurring" }

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

async function Recurring() {
  const user = await requireUser()
  const [items, categories, paymentMethods, everPaid] = await Promise.all([
    getRecurringItems(user._id),
    getCategories(user._id),
    getPaymentMethods(user._id),
    getEverPaidRecurringIds(user._id),
  ])
  const currentMonth = monthOf(user.today)
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const methodLabel = new Map(paymentMethods.map((m) => [m.id, m.label]))
  const isEnded = (i: RecurringItem) => Boolean(i.endMonth && i.endMonth < currentMonth)
  const active = items.filter((i) => !isEnded(i))
  const ended = items.filter(isEnded)
  const formProps = { categories, paymentMethods, today: user.today }

  function Row({ item }: { item: RecurringItem }) {
    const paidBefore = everPaid.has(item.id)
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">
            Due on the {ordinal(item.dueDay)} · {categoryName.get(item.categoryId) ?? "—"}
            {item.paymentMethodId && ` · ${methodLabel.get(item.paymentMethodId)}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatMonthLabel(item.startMonth, "short")} – {item.endMonth ? formatMonthLabel(item.endMonth, "short") : "no end date"}
          </span>
        </div>
        <Money amount={item.amount} currency={user.currency} className="text-sm font-medium" />
        <div className="flex gap-1">
          <RecurringDialog
            {...formProps}
            item={item}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`}>
                <PencilIcon />
              </Button>
            }
          />
          <EndRecurringDialog
            item={item}
            today={user.today}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`End ${item.name}`}>
                <CalendarOffIcon />
              </Button>
            }
          />
          {!paidBefore && (
            <ActionButton
              action={deleteRecurringAction}
              fields={{ id: item.id }}
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${item.name}`}
              successMessage={`${item.name} deleted`}
              confirm={{ title: `Delete ${item.name}?`, description: "It has never been paid, so nothing else changes.", actionLabel: "Delete" }}
            >
              <Trash2Icon />
            </ActionButton>
          )}
        </div>
      </li>
    )
  }

  return (
    <>
      <PageHeader title="Recurring" description="Bills, subscriptions, EMIs and mutual fund SIPs. Mark them paid from the dashboard.">
        <RecurringDialog
          {...formProps}
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add recurring item
            </Button>
          }
        />
      </PageHeader>

      {items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RepeatIcon />
            </EmptyMedia>
            <EmptyTitle>No recurring items yet</EmptyTitle>
            <EmptyDescription>
              Add rent, utilities, phone, streaming and any EMIs. If you&apos;ve already paid one this month, tick
              &quot;Already paid this month&quot;.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <RecurringDialog
              {...formProps}
              trigger={
                <Button variant="outline" size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Add your first bill
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {KIND_ORDER.map((kind) => {
            const rows = active.filter((i) => i.kind === kind)
            if (rows.length === 0) return null
            return (
              <Card key={kind} className="pb-0">
                <CardHeader>
                  <CardTitle>{KIND_LABEL[kind]}</CardTitle>
                  <CardDescription>
                    {rows.length} active {rows.length === 1 ? KIND_SINGULAR[kind].toLowerCase() : KIND_LABEL[kind].toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <ul className="flex flex-col divide-y border-t">
                    {rows.map((item) => (
                      <Row key={item.id} item={item} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
          {ended.length > 0 && (
            <Card className="pb-0 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Ended <Badge variant="secondary">{ended.length}</Badge>
                </CardTitle>
                <CardDescription>Kept so past months stay correct.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="flex flex-col divide-y border-t">
                  {ended.map((item) => (
                    <Row key={item.id} item={item} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

export default function RecurringPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Recurring />
    </Suspense>
  )
}
