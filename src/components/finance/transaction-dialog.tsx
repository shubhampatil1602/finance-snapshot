"use client"

import { useEffect, useState, type ReactElement } from "react"
import { toast } from "sonner"
import { createTransactionAction, updateTransactionAction } from "@/app/actions/transactions"
import { FormError, SubmitButton, useActionForm, useOnSuccess } from "@/components/forms"
import { fieldInvalid } from "@/lib/action-state"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toMajorString } from "@/lib/money"
import type { Category, DateStr, PaymentMethod, Transaction, TransactionType } from "@/lib/types"

const LAST_CATEGORY_KEY = "fs:lastCategory:"

function readLastCategory(type: TransactionType): string | null {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY + type)
  } catch {
    return null
  }
}

function rememberCategory(type: TransactionType, id: string) {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY + type, id)
  } catch {
    /* storage unavailable: fine */
  }
}

export interface TransactionFormProps {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  today: DateStr
  /** First day of the earliest editable month. */
  minDate: DateStr
  transaction?: Transaction
}

/**
 * Category options for the chosen type, and the selected one. Falls back to the
 * last-used category, then Salary for income, then the first option.
 */
function useCategoryChoice(categories: Category[], type: TransactionType, transaction?: Transaction) {
  // Only active categories, plus the record's own (possibly archived) one when editing.
  const options = categories.filter((c) => c.type === type && (!c.archived || c.id === transaction?.categoryId))
  const [chosen, setChosen] = useState<string>(() => transaction?.categoryId ?? "")
  const categoryId = options.some((c) => c.id === chosen)
    ? chosen
    : (options.find((c) => c.id === readLastCategory(type))?.id ??
      // Salary is logged manually each month, so it's the natural income default.
      options.find((c) => type === "income" && c.name === "Salary")?.id ??
      options[0]?.id ??
      "")
  return { options, categoryId, setCategoryId: setChosen }
}

function TransactionForm({ categories, paymentMethods, today, minDate, transaction, onDone }: TransactionFormProps & { onDone: () => void }) {
  const editing = Boolean(transaction)
  const { state, pending, formProps } = useActionForm(editing ? updateTransactionAction : createTransactionAction)
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense")
  const { options, categoryId, setCategoryId } = useCategoryChoice(categories, type, transaction)
  const methods = paymentMethods.filter((m) => !m.archived || m.id === transaction?.paymentMethodId)

  useOnSuccess(state, () => {
    rememberCategory(type, categoryId)
    toast.success(editing ? "Transaction updated" : type === "income" ? "Income added" : "Expense added")
    onDone()
  })

  return (
    <form {...formProps}>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />
      <FieldGroup>
        <FormError state={state} />
        {!transaction?.recurringId && <TypeToggle value={type} onChange={setType} />}
        <Field data-invalid={fieldInvalid(state, "amount")}>
          <FieldLabel htmlFor="tx-amount">Amount</FieldLabel>
          <Input
            id="tx-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            defaultValue={transaction ? toMajorString(transaction.amount) : ""}
            pattern="[0-9,]*(\.[0-9]{0,2})?"
            required
            autoFocus
            aria-invalid={fieldInvalid(state, "amount")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={fieldInvalid(state, "date")}>
            <FieldLabel htmlFor="tx-date">Date</FieldLabel>
            <Input id="tx-date" name="date" type="date" defaultValue={transaction?.date ?? today} min={minDate} max={today} required />
          </Field>
          <Field data-invalid={fieldInvalid(state, "categoryId")}>
            <FieldLabel htmlFor="tx-category">Category</FieldLabel>
            <NativeSelect
              id="tx-category"
              name="categoryId"
              className="w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {options.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {type === "expense" && <PaymentMethodField methods={methods} defaultValue={transaction?.paymentMethodId ?? ""} />}
        <Field>
          <FieldLabel htmlFor="tx-note">Note</FieldLabel>
          <Input id="tx-note" name="note" maxLength={200} placeholder="Optional" defaultValue={transaction?.note ?? ""} />
        </Field>
        <SubmitButton pending={pending} className="w-full">{editing ? "Save changes" : "Add"}</SubmitButton>
      </FieldGroup>
    </form>
  )
}

function TypeToggle({ value, onChange }: { value: TransactionType; onChange: (type: TransactionType) => void }) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v: string[]) => v[0] && onChange(v[0] as TransactionType)}
      variant="outline"
      className="w-full"
      aria-label="Type"
    >
      <ToggleGroupItem value="expense" className="flex-1">
        Expense
      </ToggleGroupItem>
      <ToggleGroupItem value="income" className="flex-1">
        Income
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function PaymentMethodField({ methods, defaultValue }: { methods: PaymentMethod[]; defaultValue: string }) {
  if (methods.length === 0) return null
  return (
    <Field>
      <FieldLabel htmlFor="tx-method">Payment method</FieldLabel>
      <NativeSelect id="tx-method" name="paymentMethodId" className="w-full" defaultValue={defaultValue}>
        <NativeSelectOption value="">None</NativeSelectOption>
        {methods.map((m) => (
          <NativeSelectOption key={m.id} value={m.id}>
            {m.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  )
}

export function TransactionDialog({
  trigger,
  shortcut,
  ...props
}: TransactionFormProps & {
  trigger: ReactElement
  /** Open with this key when nothing is focused, e.g. "n". */
  shortcut?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!shortcut) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey) return
      if (target.closest("input, textarea, select, [contenteditable=true]")) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shortcut])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.transaction ? "Edit transaction" : "Quick add"}</DialogTitle>
          <DialogDescription>
            {props.transaction?.recurringId
              ? "This pays a recurring item. Changing it keeps the item paid."
              : "Press Enter to save."}
          </DialogDescription>
        </DialogHeader>
        {open && <TransactionForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
