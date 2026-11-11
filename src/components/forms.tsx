"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"
import { AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { ActionState } from "@/lib/types"

export type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>

/** Run `onSuccess` once per successful submission (keyed on the server's `at` stamp). */
export function useOnSuccess(state: ActionState, onSuccess: () => void) {
  const seen = useRef<number | undefined>(undefined)
  const callback = useRef(onSuccess)
  useEffect(() => {
    callback.current = onSuccess
  })
  useEffect(() => {
    if (state.ok && state.at && state.at !== seen.current) {
      seen.current = state.at
      callback.current()
    }
  }, [state])
}

/**
 * useActionState for a form, without React's automatic form reset — so a
 * validation error never wipes what the user typed. Without JS, the plain
 * `action` still submits (progressive enhancement).
 */
export function useActionForm<S extends ActionState = ActionState>(action: (state: S, form: FormData) => Promise<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action as (state: Awaited<S>, form: FormData) => Promise<S>,
    {} as Awaited<S>,
  )
  const formProps = {
    action: dispatch,
    onSubmit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      startTransition(() => dispatch(data))
    },
  }
  return { state, pending, formProps }
}

export function SubmitButton({ children, pending, ...props }: ComponentProps<typeof Button> & { pending?: boolean }) {
  const status = useFormStatus()
  const busy = pending ?? status.pending
  return (
    <Button type="submit" {...props} disabled={busy || props.disabled}>
      {busy && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}

export function FormError({ state }: { state: ActionState }) {
  if (state.ok !== false || !state.error) return null
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

/**
 * A one-click mutation (archive, delete, unmark…) as a tiny form, so it works
 * before hydration. Optional confirmation dialog. Errors and success show as toasts.
 */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  successMessage,
  ...buttonProps
}: {
  action: FormAction
  fields: Record<string, string>
  children: ReactNode
  confirm?: { title: string; description: string; actionLabel?: string }
  successMessage?: string
} & Omit<ComponentProps<typeof Button>, "action" | "type">) {
  const [open, setOpen] = useState(false)
  // Feedback is raised from inside the action, not an effect: a successful delete
  // unmounts this component together with its row before any effect could run.
  const [, formAction, pending] = useActionState(async (prev: ActionState, form: FormData) => {
    const result = await action(prev, form)
    if (result.ok) {
      setOpen(false)
      if (successMessage) toast.success(successMessage)
    } else if (result.error) {
      toast.error(result.error)
    }
    return result
  }, {})

  const hidden = Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ))

  if (!confirm) {
    return (
      <form action={formAction} className="contents">
        {hidden}
        <Button type="submit" disabled={pending || buttonProps.disabled} {...buttonProps}>
          {pending && <Spinner data-icon="inline-start" />}
          {children}
        </Button>
      </form>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" {...buttonProps} />}>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} className="contents">
          {hidden}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {confirm.actionLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
