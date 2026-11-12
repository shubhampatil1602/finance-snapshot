import type { Metadata } from "next"
import { ChevronDownIcon } from "lucide-react"
import { PublicHeader, TextLink } from "@/components/public/prose"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "FAQ",
  description: `Answers to common questions about ${site.name}: safe-to-spend, recurring bills, locked months, security and your data.`,
  alternates: { canonical: "/faq" },
}

type Faq = { q: string; a: string }

const GROUPS: { title: string; items: Faq[] }[] = [
  {
    title: "The basics",
    items: [
      {
        q: `What does ${site.name} do?`,
        a: "It answers one question: how much can I still spend this month? It takes your income, subtracts what you've spent, the bills still to pay and what you plan to save, and shows what's left.",
      },
      {
        q: "Is it free?",
        a: "Yes. There are no paid plans, no ads and no trackers.",
      },
      {
        q: "Does it connect to my bank?",
        a: "No. You enter your own transactions. That keeps your bank credentials out of it entirely and takes about 15 seconds per expense.",
      },
      {
        q: "Which currencies are supported?",
        a: "You choose a currency for your account in Settings. Amounts are shown in that currency; there is no conversion between currencies.",
      },
    ],
  },
  {
    title: "Using the app",
    items: [
      {
        q: "How is “safe to spend” calculated?",
        a: "Income this month, minus expenses already logged, minus recurring bills not yet paid, minus planned savings contributions. If the number goes negative, you've committed more than you earned this month.",
      },
      {
        q: "What counts as a recurring item?",
        a: "Anything that repeats monthly: rent, utilities, subscriptions, EMIs and SIPs. Mark one paid and it becomes a linked expense; unmark it to undo.",
      },
      {
        q: "Why can't I edit an old month?",
        a: "Past months lock so your history stays accurate and matches your bank statements. Only editable months accept new, changed or deleted transactions.",
      },
      {
        q: "How do I record a refund?",
        a: "In an editable month, edit or delete the original expense so the totals stay correct.",
      },
    ],
  },
  {
    title: "Account & security",
    items: [
      {
        q: "I forgot my password. What now?",
        a: "Use “Forgot password” on the login screen. Enter your username and the unique signature you chose at sign-up, then set a new password. All your other sessions are signed out.",
      },
      {
        q: "What is the unique signature?",
        a: "A recovery phrase only you know. It's stored encrypted and is the only way to reset your password, so keep it somewhere safe. You can view or change it in Settings.",
      },
      {
        q: "How is my data protected?",
        a: "Passwords are hashed with bcrypt, your signature is encrypted with AES-256-GCM, sessions use HTTP-only secure cookies, and every query is scoped to your account.",
      },
      {
        q: "Can I export or delete my data?",
        a: "Export all your data as JSON from Settings at any time. To delete your account and everything in it, contact us and we'll remove it.",
      },
    ],
  },
]

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GROUPS.flatMap((g) => g.items).map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD for rich results; content is static and escaped of "<".
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PublicHeader title="Frequently asked questions" description="Quick answers about how it works and your data." />

      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{group.title}</h2>
          <div className="divide-y rounded-xl border bg-card">
            {group.items.map(({ q, a }) => (
              <details key={q} className="group px-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium">
                  {q}
                  <ChevronDownIcon
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="text-sm text-muted-foreground">
        Didn&apos;t find your answer? <TextLink href="/contact">Contact us</TextLink>.
      </p>
    </>
  )
}
