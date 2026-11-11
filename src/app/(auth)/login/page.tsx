import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/auth-forms"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LoginForm />
    </Suspense>
  )
}
