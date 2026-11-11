import { Suspense } from "react"
import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { MonthSwitcher, PageHeader } from "@/components/finance/display"
import { GoalsCard, RecurringCard, SafeToSpendCard, SpendingCard, TotalsRow } from "@/components/finance/dashboard-sections"
import { DashboardSkeleton } from "@/components/finance/skeletons"
import { TransactionDialog } from "@/components/finance/transaction-dialog"
import { requireUser } from "@/lib/auth/dal"
import { getGoalsWithProgress, getPaymentMethods, getSnapshot } from "@/lib/data/queries"
import { firstDayOf, isEditableMonth, monthOf, prevMonth, resolveMonthParam } from "@/lib/dates"

export const metadata: Metadata = { title: "Dashboard" }

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const user = await requireUser()
  const { month: rawMonth } = await searchParams
  const currentMonth = monthOf(user.today)
  const month = resolveMonthParam(rawMonth, user.today)
  const locked = !isEditableMonth(month, user.today)

  const [{ snapshot, categories }, paymentMethods, goals] = await Promise.all([
    getSnapshot(user._id, month, user.today),
    getPaymentMethods(user._id),
    getGoalsWithProgress(user._id),
  ])

  return (
    <>
      <PageHeader title="How much can I still spend?">
        <MonthSwitcher month={month} currentMonth={currentMonth} basePath="/" locked={locked} />
        <TransactionDialog
          categories={categories}
          paymentMethods={paymentMethods}
          today={user.today}
          minDate={firstDayOf(prevMonth(currentMonth))}
          shortcut="n"
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Quick add
              <Kbd className="ml-1 hidden bg-primary-foreground/15 text-primary-foreground sm:inline-flex">N</Kbd>
            </Button>
          }
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <SafeToSpendCard snapshot={snapshot} currency={user.currency} locked={locked} />
          <TotalsRow snapshot={snapshot} currency={user.currency} />
          <RecurringCard
            groups={snapshot.recurringGroups}
            month={month}
            today={user.today}
            currency={user.currency}
            paymentMethods={paymentMethods}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SpendingCard spending={snapshot.spending} currency={user.currency} />
          <GoalsCard goals={goals} currency={user.currency} today={user.today} />
        </div>
      </div>
    </>
  )
}

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  )
}
