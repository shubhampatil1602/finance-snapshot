import Link from "next/link"
import { LayoutDashboardIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/dal"

/** Signed in → back to the app; signed out → log in / sign up. Reads the session, so render it inside Suspense. */
export async function HeaderActions() {
  const user = await getCurrentUser()

  if (user) {
    return (
      <Button size="sm" render={<Link href="/" />} nativeButton={false}>
        <LayoutDashboardIcon data-icon="inline-start" />
        Open dashboard
      </Button>
    )
  }

  return (
    <>
      <Button variant="ghost" size="sm" render={<Link href="/login" />} nativeButton={false}>
        Log in
      </Button>
      <Button size="sm" render={<Link href="/register" />} nativeButton={false}>
        Sign up
      </Button>
    </>
  )
}
