import { Suspense } from "react"
import { redirect } from "next/navigation"
import { WalletIcon } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { SiteFooter } from "@/components/public/site-footer"
import { getCurrentUser } from "@/lib/auth/dal"

/** Signed-in users don't need the auth screens. */
async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/")
  return null
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <ModeToggle className="absolute top-4 right-4" />
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <WalletIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-lg font-semibold tracking-tight">Finance Snapshot</span>
          <span className="text-sm text-muted-foreground">How much can I still spend this month?</span>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <SiteFooter />
    </main>
  )
}
