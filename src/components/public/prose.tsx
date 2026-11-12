import type { ReactNode } from "react"
import Link from "next/link"

/** Page title block for public pages. */
export function PublicHeader({ title, description, updated }: { title: string; description?: ReactNode; updated?: string }) {
  return (
    <header className="flex flex-col gap-2 border-b pb-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      {updated && (
        <p className="text-xs text-muted-foreground">
          Last updated <time dateTime={updated}>{formatDate(updated)}</time>
        </p>
      )}
    </header>
  )
}

export function ProseSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">{children}</ul>
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "font-medium text-foreground underline underline-offset-4 hover:text-primary"
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(isoDate))
}
