import Link from "next/link"
import { PUBLIC_PAGES, site } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("flex flex-col items-center gap-2 text-xs text-muted-foreground", className)}>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {PUBLIC_PAGES.map((page) => (
            <li key={page.path}>
              <Link href={page.path} className="hover:text-foreground hover:underline underline-offset-4">
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p>{site.name}</p>
    </footer>
  )
}
