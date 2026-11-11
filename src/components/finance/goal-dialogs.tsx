"use client"

import { useState, type ReactElement } from "react"
import { toast } from "sonner"
import { addContributionAction, createGoalAction, updateGoalAction } from "@/app/actions/goals"
import { FormError, SubmitButton, useActionForm, useOnSuccess } from "@/components/forms"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatMoney, toMajorString } from "@/lib/money"
import type { ContributionDirection, DateStr, Goal } from "@/lib/types"

export function GoalDialog({ trigger, goal }: { trigger: ReactElement; goal?: Goal }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? `Edit ${goal.name}` : "New savings goal"}</DialogTitle>
          <DialogDescription>Money you put aside is taken out of safe-to-spend.</DialogDescription>
        </DialogHeader>
        {open && <GoalForm goal={goal} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { state, pending, formProps } = useActionForm(goal ? updateGoalAction : createGoalAction)
  useOnSuccess(state, () => {
    toast.success(goal ? "Goal updated" : "Goal created")
    onDone()
  })
  const err = (name: string) => state.fieldErrors?.[name]
  return (
    <form {...formProps}>
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <FieldGroup>
        <FormError state={state} />
        <Field>
          <FieldLabel htmlFor="g-name">Name</FieldLabel>
          <Input id="g-name" name="name" defaultValue={goal?.name} maxLength={60} placeholder="Emergency fund" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(err("target")) || undefined}>
            <FieldLabel htmlFor="g-target">Target</FieldLabel>
            <Input id="g-target" name="target" inputMode="decimal" defaultValue={goal ? toMajorString(goal.target) : ""} placeholder="0.00" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-date">Target date</FieldLabel>
            <Input id="g-date" name="targetDate" type="date" defaultValue={goal?.targetDate} />
          </Field>
        </div>
        <FieldDescription>The target date is for display only — no reminders.</FieldDescription>
        <SubmitButton pending={pending} className="w-full">{goal ? "Save changes" : "Create goal"}</SubmitButton>
      </FieldGroup>
    </form>
  )
}

export function ContributionDialog({
  trigger,
  goal,
  balance,
  currency,
  today,
  minDate,
}: {
  trigger: ReactElement
  goal: Goal
  balance: number
  currency: string
  today: DateStr
  minDate: DateStr
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>Balance: {formatMoney(balance, currency)}</DialogDescription>
        </DialogHeader>
        {open && <ContributionForm goal={goal} balance={balance} today={today} minDate={minDate} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ContributionForm({
  goal,
  balance,
  today,
  minDate,
  onDone,
}: {
  goal: Goal
  balance: number
  today: DateStr
  minDate: DateStr
  onDone: () => void
}) {
  const { state, pending, formProps } = useActionForm(addContributionAction)
  const [direction, setDirection] = useState<ContributionDirection>("deposit")
  useOnSuccess(state, () => {
    toast.success(direction === "deposit" ? "Deposit added" : "Withdrawal added")
    onDone()
  })
  const err = (name: string) => state.fieldErrors?.[name]
  return (
    <form {...formProps}>
      <input type="hidden" name="goalId" value={goal.id} />
      <input type="hidden" name="direction" value={direction} />
      <FieldGroup>
        <FormError state={state} />
        <ToggleGroup
          value={[direction]}
          onValueChange={(v: string[]) => v[0] && setDirection(v[0] as ContributionDirection)}
          variant="outline"
          className="w-full"
          aria-label="Direction"
        >
          <ToggleGroupItem value="deposit" className="flex-1">
            Deposit
          </ToggleGroupItem>
          <ToggleGroupItem value="withdraw" className="flex-1" disabled={balance <= 0}>
            Withdraw
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(err("amount")) || undefined}>
            <FieldLabel htmlFor="c-amount">Amount</FieldLabel>
            <Input id="c-amount" name="amount" inputMode="decimal" placeholder="0.00" required autoFocus />
          </Field>
          <Field data-invalid={Boolean(err("date")) || undefined}>
            <FieldLabel htmlFor="c-date">Date</FieldLabel>
            <Input id="c-date" name="date" type="date" defaultValue={today} min={minDate} max={today} required />
          </Field>
        </div>
        <SubmitButton pending={pending} className="w-full">{direction === "deposit" ? "Deposit" : "Withdraw"}</SubmitButton>
      </FieldGroup>
    </form>
  )
}
