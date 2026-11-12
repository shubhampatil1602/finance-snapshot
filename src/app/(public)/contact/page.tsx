import type { Metadata } from "next"
import { BugIcon, MailIcon, ShieldIcon } from "lucide-react"
import { PublicHeader, TextLink } from "@/components/public/prose"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${site.name} team for support, privacy requests or bug reports.`,
  alternates: { canonical: "/contact" },
}

const mailto = (subject: string) => `mailto:${site.contactEmail}?subject=${encodeURIComponent(subject)}`

const TOPICS = [
  {
    icon: MailIcon,
    title: "General support",
    body: "Questions about using the app, your account or a feature request.",
    subject: `${site.name}: support`,
  },
  {
    icon: ShieldIcon,
    title: "Privacy & data requests",
    body: "Account deletion, data access or anything in the Privacy Policy. Include your username.",
    subject: `${site.name}: privacy request`,
  },
  {
    icon: BugIcon,
    title: "Report a bug or security issue",
    body: "Tell us what happened and the steps to reproduce it. Please don't include passwords or your signature.",
    subject: `${site.name}: bug report`,
  },
] as const

export default function ContactPage() {
  return (
    <>
      <PublicHeader
        title="Contact us"
        description="We read every message and usually reply within two business days."
      />

      <ul className="grid gap-4 sm:grid-cols-3">
        {TOPICS.map(({ icon: Icon, title, body, subject }) => (
          <li key={title}>
            <a
              href={mailto(subject)}
              className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-6 text-sm">
        <p className="text-muted-foreground">Prefer to write directly?</p>
        <p>
          <TextLink href={`mailto:${site.contactEmail}`}>{site.contactEmail}</TextLink>
        </p>
        <p className="text-muted-foreground">
          Many questions are already answered in the <TextLink href="/faq">FAQ</TextLink>.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        We will never ask for your password or unique signature by email.
      </p>
    </>
  )
}
