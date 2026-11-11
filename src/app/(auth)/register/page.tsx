import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { RegisterForm } from "@/components/auth/auth-forms"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/lib/env"
import { listTimeZones } from "@/lib/timezones"

export const metadata: Metadata = { title: "Create account" }

/** Read SIGNUP_ENABLED at request time, not build time. */
async function Register() {
  await connection()
  return <RegisterForm signupEnabled={env.signupEnabled} timeZones={env.signupEnabled ? listTimeZones() : []} />
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[34rem] w-full rounded-xl" />}>
      <Register />
    </Suspense>
  )
}
