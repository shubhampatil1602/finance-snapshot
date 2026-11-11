"use client"

import { useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react"
import {
  changePasswordAction,
  changeSignatureAction,
  revealSignatureAction,
  type RevealState,
} from "@/app/actions/auth"
import {
  createCategoryAction,
  createPaymentMethodAction,
  updateCategoryAction,
  updatePaymentMethodAction,
  updateProfileAction,
} from "@/app/actions/settings"
import { FormError, SubmitButton, useActionForm, useOnSuccess } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { TimeZoneCombobox } from "@/components/timezone-combobox"
import { PAYMENT_METHOD_TYPES } from "@/lib/data/mappers"
import { CURRENCIES, toMajorString } from "@/lib/money"
import type { TimeZoneOption } from "@/lib/timezones"
import type { Category, PaymentMethod, PaymentMethodType, TransactionType } from "@/lib/types"

export function ProfileForm({
  currency,
  timezone,
  timeZones,
}: {
  currency: string
  /** The saved zone, matched to an option value on the server. */
  timezone: string | null
  timeZones: TimeZoneOption[]
}) {
  const { state, pending, formProps } = useActionForm(updateProfileAction)
  const [tz, setTz] = useState(timezone)
  useOnSuccess(state, () => toast.success("Settings saved"))
  return (
    <form {...formProps}>
      <FieldGroup>
        <FormError state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <NativeSelect id="currency" name="currency" defaultValue={currency} className="w-full">
              {CURRENCIES.map((c) => (
                <NativeSelectOption key={c.code} value={c.code}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>Formatting only. Nothing is converted.</FieldDescription>
          </Field>
          <Field data-invalid={Boolean(state.fieldErrors?.timezone) || undefined}>
            <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
            <TimeZoneCombobox
              id="timezone"
              name="timezone"
              options={timeZones}
              value={tz}
              onValueChange={setTz}
              invalid={Boolean(state.fieldErrors?.timezone)}
              required
            />
            <FieldDescription>Changes what &quot;today&quot; is. Existing records never move.</FieldDescription>
          </Field>
        </div>
        <div>
          <SubmitButton pending={pending}>Save</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  )
}

/** Inline row: rename + one current monthly budget (expense categories only). */
export function CategoryRowForm({ category }: { category: Category }) {
  const { state, pending, formProps } = useActionForm(updateCategoryAction)
  useOnSuccess(state, () => toast.success(`${category.name} saved`))
  return (
    <form {...formProps} className="flex flex-1 flex-wrap items-start gap-2">
      <input type="hidden" name="id" value={category.id} />
      <Input name="name" defaultValue={category.name} aria-label="Category name" className="min-w-32 flex-1" maxLength={40} required />
      {category.type === "expense" && (
        <Input
          name="monthlyBudget"
          inputMode="decimal"
          defaultValue={category.monthlyBudget ? toMajorString(category.monthlyBudget) : ""}
          placeholder="No budget"
          aria-label={`${category.name} monthly budget`}
          className="w-28"
        />
      )}
      <SubmitButton pending={pending} variant="outline">Save</SubmitButton>
      {state.ok === false && state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

export function AddCategoryForm({ type }: { type: TransactionType }) {
  const { state, pending, formProps } = useActionForm(createCategoryAction)
  const formRef = useRef<HTMLFormElement>(null)
  useOnSuccess(state, () => {
    formRef.current?.reset()
    toast.success("Category added")
  })
  return (
    <form ref={formRef} {...formProps} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="type" value={type} />
      <Input name="name" placeholder={`New ${type} category`} aria-label="New category name" className="min-w-32 flex-1" maxLength={40} required />
      {type === "expense" && <Input name="monthlyBudget" inputMode="decimal" placeholder="Budget" aria-label="Monthly budget" className="w-28" />}
      <SubmitButton pending={pending}>Add</SubmitButton>
      {state.ok === false && state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

/** Type select + bank name input, shared by the add and edit forms. */
function PaymentMethodFields({ defaultType, defaultName }: { defaultType: PaymentMethodType; defaultName?: string }) {
  const [type, setType] = useState<PaymentMethodType>(defaultType)
  return (
    <>
      <NativeSelect name="type" aria-label="Type" value={type} onChange={(e) => setType(e.target.value as PaymentMethodType)}>
        {PAYMENT_METHOD_TYPES.map((t) => (
          <NativeSelectOption key={t.value} value={t.value}>
            {t.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        name="name"
        defaultValue={defaultName}
        placeholder={type === "cash" ? "Name (optional)" : "Bank name, e.g. HDFC"}
        aria-label="Bank name"
        className="min-w-32 flex-1"
        maxLength={40}
        required={type !== "cash"}
      />
    </>
  )
}

export function AddPaymentMethodForm() {
  const { state, pending, formProps } = useActionForm(createPaymentMethodAction)
  const formRef = useRef<HTMLFormElement>(null)
  // Remount the fields on success so the controlled type select resets with the form.
  const [resetKey, setResetKey] = useState(0)
  useOnSuccess(state, () => {
    formRef.current?.reset()
    setResetKey((k) => k + 1)
    toast.success("Payment method added")
  })
  return (
    <form ref={formRef} {...formProps} className="flex flex-wrap items-start gap-2">
      <PaymentMethodFields key={resetKey} defaultType="upi" />
      <SubmitButton pending={pending}>Add</SubmitButton>
      {state.ok === false && state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

function EditPaymentMethodForm({ method, onDone }: { method: PaymentMethod; onDone: () => void }) {
  const { state, pending, formProps } = useActionForm(updatePaymentMethodAction)
  useOnSuccess(state, () => {
    toast.success("Payment method saved")
    onDone()
  })
  return (
    <form {...formProps} className="flex flex-1 flex-wrap items-start gap-2">
      <input type="hidden" name="id" value={method.id} />
      <PaymentMethodFields defaultType={method.type} defaultName={method.name} />
      <SubmitButton pending={pending}>Save</SubmitButton>
      <Button type="button" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      {state.ok === false && state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

/** One payment method: label with archive/delete actions, or an inline edit form. */
export function PaymentMethodRow({ method, actions }: { method: PaymentMethod; actions: ReactNode }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <li className="flex px-3 py-2 text-sm">
        <EditPaymentMethodForm method={method} onDone={() => setEditing(false)} />
      </li>
    )
  }
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <span className={method.archived ? "flex flex-1 items-center gap-2 text-muted-foreground" : "flex flex-1 items-center gap-2"}>
        {method.label}
        {method.archived && <Badge variant="secondary">Archived</Badge>}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${method.label}`} onClick={() => setEditing(true)}>
        <PencilIcon />
      </Button>
      {actions}
    </li>
  )
}

/* ---------------- Security ---------------- */

export function RevealSignature() {
  const { state, pending, formProps } = useActionForm<RevealState>(revealSignatureAction)
  const [hidden, setHidden] = useState(false)
  const revealed = state.ok && state.signature && !hidden

  if (revealed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm break-all">{state.signature}</code>
        <Button variant="outline" size="sm" onClick={() => setHidden(true)}>
          <EyeOffIcon data-icon="inline-start" />
          Hide
        </Button>
      </div>
    )
  }

  return (
    <form {...formProps} onSubmit={(e) => { setHidden(false); formProps.onSubmit(e) }} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">••••••••••</code>
        <Input name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" aria-label="Current password" className="w-48" required />
        <SubmitButton pending={pending} variant="outline">
          <EyeIcon data-icon="inline-start" />
          Reveal
        </SubmitButton>
      </div>
      {state.ok === false && state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

export function ChangeSignatureForm() {
  const { state, pending, formProps } = useActionForm(changeSignatureAction)
  const formRef = useRef<HTMLFormElement>(null)
  useOnSuccess(state, () => {
    formRef.current?.reset()
    toast.success("Signature changed")
  })
  return (
    <form ref={formRef} {...formProps}>
      <FieldGroup>
        <FormError state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state.fieldErrors?.signature) || undefined}>
            <FieldLabel htmlFor="new-signature">New signature</FieldLabel>
            <Input id="new-signature" name="signature" type="password" autoComplete="off" minLength={8} required />
          </Field>
          <Field data-invalid={Boolean(state.fieldErrors?.currentPassword) || undefined}>
            <FieldLabel htmlFor="sig-current">Current password</FieldLabel>
            <Input id="sig-current" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
        </div>
        <div>
          <SubmitButton pending={pending} variant="outline">Change signature</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ChangePasswordForm() {
  const { state, pending, formProps } = useActionForm(changePasswordAction)
  const formRef = useRef<HTMLFormElement>(null)
  useOnSuccess(state, () => {
    formRef.current?.reset()
    toast.success("Password changed")
  })
  return (
    <form ref={formRef} {...formProps}>
      <FieldGroup>
        <FormError state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state.fieldErrors?.currentPassword) || undefined}>
            <FieldLabel htmlFor="pw-current">Current password</FieldLabel>
            <Input id="pw-current" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field data-invalid={Boolean(state.fieldErrors?.newPassword) || undefined}>
            <FieldLabel htmlFor="pw-new">New password</FieldLabel>
            <Input id="pw-new" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </div>
        <div>
          <SubmitButton pending={pending} variant="outline">Change password</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  )
}
