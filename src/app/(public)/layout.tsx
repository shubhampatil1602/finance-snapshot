import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { WalletIcon } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { HeaderActions } from "@/components/public/header-actions"
import { SiteFooter } from "@/components/public/site-footer"
import { Skeleton } from "@/components/ui/skeleton"
import { site } from "@/lib/site"

// Unlike the app, these pages are meant to be found.
export const metadata: Metadata = { robots: { index: true, follow: true } }

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <Link href="/about" className="flex items-center gap-2 font-heading font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <WalletIcon className="size-4" />
            </span>
            <span className="max-sm:sr-only">{site.name}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ModeToggle />
            <Suspense fallback={<Skeleton className="h-8 w-36 rounded-lg" />}>
              <HeaderActions />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10">{children}</main>
      <SiteFooter className="border-t px-4 py-6" />
    </div>
  )
}
