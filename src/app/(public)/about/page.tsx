import type { Metadata } from "next"
import Link from "next/link"
import { CalendarCheckIcon, LockIcon, PiggyBankIcon, ReceiptTextIcon } from "lucide-react"
import { Bullets, ProseSection, PublicHeader, TextLink } from "@/components/public/prose"
import { Button } from "@/components/ui/button"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "About",
  description: site.description,
  alternates: { canonical: "/about" },
}

const FEATURES = [
  {
    icon: ReceiptTextIcon,
    title: "Every rupee in one place",
    body: "Log income and expenses in seconds. Each one lands in the right month, in your own timezone.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Bills you won't forget",
    body: "Rent, subscriptions, EMIs and SIPs repeat every month. Mark them paid and the snapshot updates.",
  },
  {
    icon: PiggyBankIcon,
    title: "Savings that come first",
    body: "Set goals and contributions. What you meant to save is held back before you see what's left.",
  },
  {
    icon: LockIcon,
    title: "Private by design",
    body: "Your data is yours. No bank logins, no ads, no selling. Export everything as JSON at any time.",
  },
] as const

export default function AboutPage() {
  return (
    <>
      <PublicHeader title={`About ${site.name}`} description={site.tagline} />

      <ProseSection title="Why it exists">
        <p>
          If you get paid once a month, it&apos;s surprisingly hard to know where you stand by the 15th. What you&apos;ve
          spent sits in a bank app, the bills still to come live in your head, and what you meant to save is a note
          somewhere. So you either overspend and dip into savings, or hold back and worry anyway.
        </p>
        <p>
          {site.name} pulls those pieces together and answers one question at a glance:{" "}
          <strong>how much can I still spend this month?</strong>
        </p>
      </ProseSection>

      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <Icon className="size-5 text-primary" aria-hidden />
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      <ProseSection title="Who it's for">
        <p>
          One salaried person with a predictable monthly income, managing their own money. Every account is separate
          and private; there are no shared or household accounts.
        </p>
      </ProseSection>

      <ProseSection title="What it isn't">
        <Bullets>
          <li>It doesn&apos;t connect to your bank. You enter what matters, so nothing is ever pulled without you.</li>
          <li>It isn&apos;t investment, tax or financial advice. It shows your own numbers back to you, clearly.</li>
        </Bullets>
      </ProseSection>

      <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/40 p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Set up your month in under ten minutes</h2>
        <p className="text-sm text-muted-foreground">
          Have questions first? Read the <TextLink href="/faq">FAQ</TextLink> or{" "}
          <TextLink href="/contact">get in touch</TextLink>.
        </p>
        <Button render={<Link href="/register" />} nativeButton={false}>
          Create a free account
        </Button>
      </div>
    </>
  )
}
