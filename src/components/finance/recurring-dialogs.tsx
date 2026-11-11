"use client"

import { useState, type ReactElement } from "react"
import { toast } from "sonner"
import { TriangleAlertIcon } from "lucide-react"
import { createRecurringAction, endRecurringAction, markPaidAction, updateRecurringAction } from "@/app/actions/recurring"
import { FormError, SubmitButton, useActionForm, useOnSuccess } from "@/components/forms"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { effectiveDueDate, firstDayOf, formatMonthLabel, isMonth, monthOf } from "@/lib/dates"
import { canMarkAlreadyPaid } from "@/lib/domain/recurring"
import { toMajorString } from "@/lib/money"
import type { Category, DateStr, Kind, MonthStr, PaymentMethod, RecurringItem } from "@/lib/types"

function ControlledDialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: ReactElement
  title: string
  description?: string
  children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Add / edit ---------------- */

interface RecurringFormProps {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  today: DateStr
  item?: RecurringItem
}

function RecurringForm({ categories, paymentMethods, today, item, onDone }: RecurringFormProps & { onDone: () => void }) {
  const editing = Boolean(item)
  const { state, pending, formProps } = useActionForm(editing ? updateRecurringAction : createRecurringAction)
  const currentMonth = monthOf(today)
  const [kind, setKind] = useState<Kind>(item?.kind ?? "bill")
  const [dueDay, setDueDay] = useState(String(item?.dueDay ?? ""))
  const [startMonth, setStartMonth] = useState<MonthStr>(item?.startMonth ?? currentMonth)
  const [endMonth, setEndMonth] = useState<string>(item?.endMonth ?? "")
  const [methodId, setMethodId] = useState(item?.paymentMethodId ?? "")
  const [alreadyPaid, setAlreadyPaid] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === "expense" && (!c.archived || c.id === item?.categoryId))
  const methods = paymentMethods.filter((m) => !m.archived || m.id === item?.paymentMethodId)
  const isCreditCard = methods.find((m) => m.id === methodId)?.type === "credit_card"
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? expenseCategories[0]?.id ?? "")

  function changeKind(next: Kind) {
    setKind(next)
    // New SIPs default to the "Investments" category when the user has one.
    if (!editing && next === "mutual_fund") {
      const investments = expenseCategories.find((c) => c.name.trim().toLowerCase() === "investments")
      if (investments) setCategoryId(investments.id)
    }
  }

  const day = Number(dueDay)
  const validDay = Number.isInteger(day) && day >= 1 && day <= 31
  const showAlreadyPaid =
    !editing &&
    validDay &&
    isMonth(startMonth) &&
    canMarkAlreadyPaid({ dueDay: day, startMonth, endMonth: isMonth(endMonth) ? endMonth : undefined }, today)

  useOnSuccess(state, () => {
    toast.success(editing ? "Recurring item updated" : "Recurring item added")
    onDone()
  })
  const err = (name: string) => state.fieldErrors?.[name]

  return (
    <form {...formProps}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(err("name")) || undefined}>
          <FieldLabel htmlFor="rc-name">Name</FieldLabel>
          <Input id="rc-name" name="name" defaultValue={item?.name} maxLength={60} placeholder="Rent, Netflix, Phone EMI, Index fund SIP…" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="rc-kind">Kind</FieldLabel>
            <NativeSelect id="rc-kind" name="kind" className="w-full" value={kind} onChange={(e) => changeKind(e.target.value as Kind)}>
              <NativeSelectOption value="bill">Bill</NativeSelectOption>
              <NativeSelectOption value="subscription">Subscription</NativeSelectOption>
              <NativeSelectOption value="emi">EMI</NativeSelectOption>
              <NativeSelectOption value="mutual_fund">Mutual fund (SIP)</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field data-invalid={Boolean(err("amount")) || undefined}>
            <FieldLabel htmlFor="rc-amount">Amount</FieldLabel>
            <Input id="rc-amount" name="amount" inputMode="decimal" defaultValue={item ? toMajorString(item.amount) : ""} placeholder="0.00" required />
          </Field>
          <Field data-invalid={Boolean(err("dueDay")) || undefined}>
            <FieldLabel htmlFor="rc-due">Due day</FieldLabel>
            <Input id="rc-due" name="dueDay" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="rc-category">Category</FieldLabel>
            <NativeSelect id="rc-category" name="categoryId" className="w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {expenseCategories.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={Boolean(err("startMonth")) || undefined}>
            <FieldLabel htmlFor="rc-start">Start month</FieldLabel>
            <Input id="rc-start" name="startMonth" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
          </Field>
          <Field data-invalid={Boolean(err("endMonth")) || undefined}>
            <FieldLabel htmlFor="rc-end">End month{kind === "emi" ? "" : " (optional)"}</FieldLabel>
            <Input
              id="rc-end"
              name="endMonth"
              type="month"
              min={startMonth}
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              required={kind === "emi"}
            />
          </Field>
        </div>
        {kind === "emi" && (
          <FieldDescription>
            Log only the EMI, never the full purchase. Use the amount on your statement — no interest maths.
          </FieldDescription>
        )}
        {methods.length > 0 && (
          <Field>
            <FieldLabel htmlFor="rc-method">Default payment method</FieldLabel>
            <NativeSelect id="rc-method" name="paymentMethodId" className="w-full" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              <NativeSelectOption value="">None</NativeSelectOption>
              {methods.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        {isCreditCard && (
          <Alert>
            <TriangleAlertIcon />
            <AlertDescription>
              Paid by credit card: this counts as spent on the day it&apos;s charged. Never log the credit card bill
              payment itself, or you&apos;ll count it twice.
            </AlertDescription>
          </Alert>
        )}
        {showAlreadyPaid && (
          <Field orientation="horizontal">
            <Checkbox id="rc-paid" name="alreadyPaid" checked={alreadyPaid} onCheckedChange={(v) => setAlreadyPaid(Boolean(v))} />
            <FieldLabel htmlFor="rc-paid" className="font-normal">
              Already paid this month
            </FieldLabel>
          </Field>
        )}
        {showAlreadyPaid && alreadyPaid && (
          <Field data-invalid={Boolean(err("paidDate")) || undefined}>
            <FieldLabel htmlFor="rc-paid-date">Paid on</FieldLabel>
            <Input
              id="rc-paid-date"
              name="paidDate"
              type="date"
              defaultValue={effectiveDueDate(day, monthOf(today))}
              min={firstDayOf(monthOf(today))}
              max={today}
              required
            />
          </Field>
        )}
        <SubmitButton pending={pending} className="w-full">{editing ? "Save changes" : "Add recurring item"}</SubmitButton>
      </FieldGroup>
    </form>
  )
}

export function RecurringDialog({ trigger, ...props }: RecurringFormProps & { trigger: ReactElement }) {
  return (
    <ControlledDialog
      trigger={trigger}
      title={props.item ? `Edit ${props.item.name}` : "Add recurring item"}
      description={props.item ? "Amount changes apply to months that aren't paid yet." : "Bills, subscriptions, EMIs and mutual fund SIPs that repeat every month."}
    >
      {(close) => <RecurringForm {...props} onDone={close} />}
    </ControlledDialog>
  )
}

/* ---------------- Mark paid ---------------- */

export function MarkPaidDialog({
  trigger,
  item,
  forMonth,
  amount,
  today,
  paymentMethods,
}: {
  trigger: ReactElement
  item: RecurringItem
  forMonth: MonthStr
  amount: number
  today: DateStr
  paymentMethods: PaymentMethod[]
}) {
  return (
    <ControlledDialog trigger={trigger} title={`Mark ${item.name} paid`} description={`For ${formatMonthLabel(forMonth)}. Creates one expense dated when you actually paid.`}>
      {(close) => <MarkPaidForm item={item} forMonth={forMonth} amount={amount} today={today} paymentMethods={paymentMethods} onDone={close} />}
    </ControlledDialog>
  )
}

function MarkPaidForm({
  item,
  forMonth,
  amount,
  today,
  paymentMethods,
  onDone,
}: {
  item: RecurringItem
  forMonth: MonthStr
  amount: number
  today: DateStr
  paymentMethods: PaymentMethod[]
  onDone: () => void
}) {
  const { state, pending, formProps } = useActionForm(markPaidAction)
  useOnSuccess(state, () => {
    toast.success(`${item.name} marked paid`)
    onDone()
  })
  const methods = paymentMethods.filter((m) => !m.archived || m.id === item.paymentMethodId)
  const err = (name: string) => state.fieldErrors?.[name]
  return (
    <form {...formProps}>
      <input type="hidden" name="recurringId" value={item.id} />
      <input type="hidden" name="forMonth" value={forMonth} />
      <FieldGroup>
        <FormError state={state} />
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(err("amount")) || undefined}>
            <FieldLabel htmlFor="mp-amount">Amount</FieldLabel>
            <Input id="mp-amount" name="amount" inputMode="decimal" defaultValue={toMajorString(amount)} required autoFocus />
          </Field>
          <Field data-invalid={Boolean(err("date")) || undefined}>
            <FieldLabel htmlFor="mp-date">Paid on</FieldLabel>
            <Input id="mp-date" name="date" type="date" defaultValue={today} min={firstDayOf(forMonth)} max={today} required />
          </Field>
        </div>
        {methods.length > 0 && (
          <Field>
            <FieldLabel htmlFor="mp-method">Payment method</FieldLabel>
            <NativeSelect id="mp-method" name="paymentMethodId" className="w-full" defaultValue={item.paymentMethodId ?? ""}>
              <NativeSelectOption value="">None</NativeSelectOption>
              {methods.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <SubmitButton pending={pending} className="w-full">Mark paid</SubmitButton>
      </FieldGroup>
    </form>
  )
}

/* ---------------- End ---------------- */

export function EndRecurringDialog({ trigger, item, today }: { trigger: ReactElement; item: RecurringItem; today: DateStr }) {
  return (
    <ControlledDialog
      trigger={trigger}
      title={`End ${item.name}`}
      description="It stops appearing after the end month. Past months keep their history."
    >
      {(close) => <EndForm item={item} today={today} onDone={close} />}
    </ControlledDialog>
  )
}

function EndForm({ item, today, onDone }: { item: RecurringItem; today: DateStr; onDone: () => void }) {
  const { state, pending, formProps } = useActionForm(endRecurringAction)
  useOnSuccess(state, () => {
    toast.success(`${item.name} ended`)
    onDone()
  })
  const current = monthOf(today)
  const defaultEnd = item.startMonth > current ? item.startMonth : current
  return (
    <form {...formProps}>
      <input type="hidden" name="id" value={item.id} />
      <FieldGroup>
        <FormError state={state} />
        <Field>
          <FieldLabel htmlFor="end-month">Last month it applies to</FieldLabel>
          <Input id="end-month" name="endMonth" type="month" min={item.startMonth} defaultValue={item.endMonth ?? defaultEnd} required autoFocus />
        </Field>
        <SubmitButton pending={pending} className="w-full">End item</SubmitButton>
      </FieldGroup>
    </form>
  )
}
