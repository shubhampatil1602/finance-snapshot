import { Suspense } from "react"
import { AppSidebar, NavUser } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarMenuSkeleton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/auth/dal"

/** Reads the session, so it streams in behind its own boundary and doesn't block the shell. */
async function SidebarUser() {
  const user = await requireUser()
  return <NavUser username={user.username} />
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        footer={
          <Suspense fallback={<SidebarMenuSkeleton showIcon />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 bg-background/90 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 md:hidden" />
          <span className="text-sm font-medium md:hidden">Finance Snapshot</span>
          <ModeToggle className="ml-auto -mr-1" />
        </header>
        <main className="flex w-full flex-1 flex-col gap-6 px-4 pb-6 md:px-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
