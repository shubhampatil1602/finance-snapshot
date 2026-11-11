"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon } from "lucide-react"
import { forgotPasswordAction, loginAction, registerAction } from "@/app/actions/auth"
import { FormError, SubmitButton, useActionForm } from "@/components/forms"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import { findTimeZone, TimeZoneCombobox } from "@/components/timezone-combobox"
import type { TimeZoneOption } from "@/lib/timezones"
import type { ActionState } from "@/lib/types"

function fieldError(state: ActionState, name: string) {
  return state.fieldErrors?.[name]
}

export function LoginForm() {
  const { state, pending, formProps } = useActionForm(loginAction)
  const reset = useSearchParams().get("reset") === "1"
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>See how much you can still spend this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <form {...formProps}>
          <FieldGroup>
            {reset && (
              <Alert>
                <CheckCircle2Icon />
                <AlertDescription>Password changed. Log in with your new password.</AlertDescription>
              </Alert>
            )}
            <FormError state={state} />
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" name="username" autoComplete="username" required autoFocus />
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput id="password" name="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton pending={pending} className="w-full">Log in</SubmitButton>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        New here?&nbsp;
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </CardFooter>
    </Card>
  )
}

const subscribeNoop = () => () => {}

export function RegisterForm({ signupEnabled, timeZones }: { signupEnabled: boolean; timeZones: TimeZoneOption[] }) {
  const { state, pending, formProps } = useActionForm(registerAction)
  // Pre-select the browser's zone; the server render has none until hydration.
  const browserTz = useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  )
  const detectedTz = useMemo(() => findTimeZone(timeZones, browserTz)?.value ?? null, [timeZones, browserTz])
  const [tzEdited, setTzEdited] = useState<{ value: string | null } | null>(null)
  const timezone = tzEdited ? tzEdited.value : detectedTz

  if (!signupEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign-up is closed</CardTitle>
          <CardDescription>New accounts are turned off on this server.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm underline underline-offset-4">
            Back to log in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Your data is private to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form {...formProps}>
          <FieldGroup>
            <FormError state={state} />
            <Field data-invalid={Boolean(fieldError(state, "username")) || undefined}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                required
                autoFocus
                aria-invalid={Boolean(fieldError(state, "username")) || undefined}
              />
              <FieldDescription>3–32 characters. Not case-sensitive.</FieldDescription>
            </Field>
            <Field data-invalid={Boolean(fieldError(state, "password")) || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field data-invalid={Boolean(fieldError(state, "signature")) || undefined}>
              <FieldLabel htmlFor="signature">Unique signature</FieldLabel>
              <PasswordInput id="signature" name="signature" autoComplete="off" minLength={8} required />
              <FieldDescription>
                A recovery phrase (8+ characters) you&apos;ll use with your username to reset a forgotten password.
                It can&apos;t match your username or password.
              </FieldDescription>
            </Field>
            <Field data-invalid={Boolean(fieldError(state, "timezone")) || undefined}>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <TimeZoneCombobox
                id="timezone"
                name="timezone"
                options={timeZones}
                value={timezone}
                onValueChange={(value) => setTzEdited({ value })}
                invalid={Boolean(fieldError(state, "timezone"))}
                required
              />
              <FieldDescription>Decides what &quot;today&quot; is for your records.</FieldDescription>
            </Field>
            <SubmitButton pending={pending} className="w-full">Create account</SubmitButton>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?&nbsp;
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </CardFooter>
    </Card>
  )
}

export function ForgotPasswordForm() {
  const { state, pending, formProps } = useActionForm(forgotPasswordAction)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your username and unique signature. You&apos;ll be logged out everywhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form {...formProps}>
          <FieldGroup>
            <FormError state={state} />
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" name="username" autoComplete="username" required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="signature">Unique signature</FieldLabel>
              <PasswordInput id="signature" name="signature" autoComplete="off" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} required />
            </Field>
            <SubmitButton pending={pending} className="w-full">Reset password</SubmitButton>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      </CardFooter>
    </Card>
  )
}
