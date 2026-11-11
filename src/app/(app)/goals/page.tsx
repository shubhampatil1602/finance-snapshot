import { Suspense } from "react"
import type { Metadata } from "next"
import { ArchiveIcon, ArchiveRestoreIcon, ArrowDownUpIcon, PencilIcon, PlusIcon, TargetIcon, Trash2Icon, XIcon } from "lucide-react"
import { deleteContributionAction, deleteGoalAction, setGoalArchivedAction } from "@/app/actions/goals"
import { ActionButton } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { GoalProgress } from "@/components/finance/dashboard-sections"
import { Money, PageHeader } from "@/components/finance/display"
import { ContributionDialog, GoalDialog } from "@/components/finance/goal-dialogs"
import { ListSkeleton } from "@/components/finance/skeletons"
import { requireUser } from "@/lib/auth/dal"
import { getGoalsWithProgress } from "@/lib/data/queries"
import { firstDayOf, formatDateLabel, isEditableMonth, monthOf, prevMonth } from "@/lib/dates"

export const metadata: Metadata = { title: "Goals" }

async function Goals() {
  const user = await requireUser()
  const goals = await getGoalsWithProgress(user._id)
  const minDate = firstDayOf(prevMonth(monthOf(user.today)))

  return (
    <>
      <PageHeader title="Savings goals" description="Deposits reduce safe-to-spend in their month; withdrawals add it back.">
        <GoalDialog
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              New goal
            </Button>
          }
        />
      </PageHeader>

      {goals.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No goals yet</EmptyTitle>
            <EmptyDescription>An emergency fund, a trip, a new laptop. Deposits stop counting as spendable.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <GoalDialog
              trigger={
                <Button variant="outline" size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Create your first goal
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map(({ goal, balance, contributions }) => {
            const recent = contributions.slice(0, 5)
            return (
              <Card key={goal.id} className={goal.archived ? "opacity-70" : undefined}>
                <CardHeader>
                  <CardTitle className="sr-only">{goal.name}</CardTitle>
                  {goal.archived && (
                    <Badge variant="secondary" className="mb-1">
                      Archived
                    </Badge>
                  )}
                  <GoalProgress goal={goal} balance={balance} currency={user.currency} today={user.today} />
                </CardHeader>
                <CardContent>
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deposits yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {recent.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="w-14 text-muted-foreground tabular-nums">{formatDateLabel(c.date)}</span>
                          <span className="flex-1">{c.direction === "deposit" ? "Deposit" : "Withdrawal"}</span>
                          <Money
                            amount={c.direction === "deposit" ? c.amount : -c.amount}
                            currency={user.currency}
                            signed
                          />
                          {isEditableMonth(monthOf(c.date), user.today) ? (
                            <ActionButton
                              action={deleteContributionAction}
                              fields={{ id: c.id }}
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Remove contribution"
                              successMessage="Contribution removed"
                              confirm={{ title: "Remove this contribution?", description: "The goal balance and that month's safe-to-spend change.", actionLabel: "Remove" }}
                            >
                              <XIcon />
                            </ActionButton>
                          ) : (
                            <span className="size-6" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {!goal.archived && (
                    <ContributionDialog
                      goal={goal}
                      balance={balance}
                      currency={user.currency}
                      today={user.today}
                      minDate={minDate}
                      trigger={
                        <Button size="sm">
                          <ArrowDownUpIcon data-icon="inline-start" />
                          Deposit / withdraw
                        </Button>
                      }
                    />
                  )}
                  <GoalDialog
                    goal={goal}
                    trigger={
                      <Button variant="outline" size="sm">
                        <PencilIcon data-icon="inline-start" />
                        Edit
                      </Button>
                    }
                  />
                  <ActionButton
                    action={setGoalArchivedAction}
                    fields={{ id: goal.id, archived: String(!goal.archived) }}
                    variant="ghost"
                    size="sm"
                    successMessage={goal.archived ? "Goal restored" : "Goal archived"}
                  >
                    {goal.archived ? <ArchiveRestoreIcon data-icon="inline-start" /> : <ArchiveIcon data-icon="inline-start" />}
                    {goal.archived ? "Unarchive" : "Archive"}
                  </ActionButton>
                  {contributions.length === 0 && (
                    <ActionButton
                      action={deleteGoalAction}
                      fields={{ id: goal.id }}
                      variant="ghost"
                      size="sm"
                      successMessage="Goal deleted"
                      confirm={{ title: `Delete ${goal.name}?`, description: "It has no contributions, so nothing else changes.", actionLabel: "Delete" }}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Delete
                    </ActionButton>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Goals />
    </Suspense>
  )
}
