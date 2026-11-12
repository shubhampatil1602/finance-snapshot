"use client"

import type { ReactNode } from "react"
import { useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRightIcon,
  BookOpenIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  InfoIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  RepeatIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react"
import { logoutAction } from "@/app/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon },
  { href: "/recurring", label: "Recurring", icon: RepeatIcon },
  { href: "/goals", label: "Goals", icon: TargetIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/guide", label: "Guide", icon: BookOpenIcon },
] as const

const HELP_LINKS = [
  { href: "/about", label: "About", icon: InfoIcon },
  { href: "/faq", label: "FAQ", icon: CircleHelpIcon },
  { href: "/contact", label: "Contact", icon: MailIcon },
  { href: "/privacy", label: "Privacy Policy", icon: ShieldIcon },
  { href: "/terms", label: "Terms & Conditions", icon: ScrollTextIcon },
] as const

export function AppSidebar({ footer }: { footer: ReactNode }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeOnMobile = () => isMobile && setOpenMobile(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" onClick={closeOnMobile} />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <WalletIcon className="size-4" />
              </span>
              <span className="font-medium">Finance Snapshot</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Main">
              {LINKS.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={<Link href={href} aria-current={active ? "page" : undefined} onClick={closeOnMobile} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Help &amp; legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Help and legal">
              {HELP_LINKS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    size="sm"
                    tooltip={label}
                    render={<Link href={href} onClick={closeOnMobile} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function NavUser({ username }: { username: string }) {
  const { isMobile } = useSidebar()
  const [pending, startTransition] = useTransition()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-accent text-xs font-medium uppercase">
              {username.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{username}</span>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-48">
            <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => logoutAction())}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
