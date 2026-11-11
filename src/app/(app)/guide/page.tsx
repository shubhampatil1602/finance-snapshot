import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { InfoIcon, LockIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { PageHeader } from "@/components/finance/display"

export const metadata: Metadata = { title: "Guide" }

const SECTIONS = [
  { id: "setup", title: "Set up your first month" },
  { id: "dashboard", title: "Read the dashboard" },
  { id: "transactions", title: "Log transactions" },
  { id: "recurring", title: "Bills, subscriptions, EMIs & SIPs" },
  { id: "goals", title: "Savings goals" },
  { id: "months", title: "Months & locking" },
  { id: "settings", title: "Settings & your data" },
  { id: "faq", title: "Common questions" },
] as const

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-16">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-2 pl-5 marker:text-muted-foreground">{children}</ol>
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-muted-foreground">{children}</ul>
}

/** A label the user will see on screen, e.g. a button name. */
function Ui({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
      {children}
    </Link>
  )
}

export default function GuidePage() {
  return (
    <>
      <PageHeader
        title="How to use Finance Snapshot"
        description="One question, answered at a glance: how much can I still spend this month?"
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <nav aria-label="Guide sections" className="lg:sticky lg:top-16 lg:self-start">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-6 lg:col-span-3">
          <Section id="setup" title="Set up your first month" description="About 10 minutes, once. After that it's a few seconds per expense.">
            <Steps>
              <li>
                In <PageLink href="/settings">Settings</PageLink>, check your <Ui>Currency</Ui> and <Ui>Timezone</Ui>. Add the
                cards and UPI apps you pay with under <Ui>Payment methods</Ui> (optional).
              </li>
              <li>
                Log this month&apos;s salary: press <Ui>Quick add</Ui> on the dashboard, choose income, category <Ui>Salary</Ui>.
              </li>
              <li>
                In <PageLink href="/recurring">Recurring</PageLink>, add rent, utilities, phone, streaming and any EMIs. If you&apos;ve
                already paid one this month, tick <Ui>Already paid this month</Ui>.
              </li>
              <li>
                Optionally create a goal in <PageLink href="/goals">Goals</PageLink>, like an emergency fund, and make a deposit.
              </li>
              <li>
                Go back to the <PageLink href="/">Dashboard</PageLink>. The big number is what you can still spend.
              </li>
            </Steps>
          </Section>

          <Section id="dashboard" title="Read the dashboard" description="Everything is calculated live from your records. Nothing is stored or estimated.">
            <p>
              <Ui>Safe to spend</Ui> for a month is:
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-6">
              income logged this month
              <br />− expenses this month
              <br />− SIPs paid this month (invested)
              <br />− recurring items not yet paid (Upcoming + Overdue)
              <br />− goal deposits this month
              <br />+ goal withdrawals this month
            </div>
            <Bullets>
              <li>
                Only income you&apos;ve actually logged counts. If salary hasn&apos;t arrived yet, the number goes negative and turns
                red. That&apos;s intended: it shows the real position.
              </li>
              <li>
                <Ui>Recurring this month</Ui> lists bills, subscriptions and EMIs grouped by kind, with a subtotal for each and a{" "}
                <Ui>Mark paid</Ui> button.
              </li>
              <li>
                <Ui>Spending by category</Ui> shows each category&apos;s total, with a progress bar where you&apos;ve set a budget.
              </li>
              <li>
                <Ui>Invested</Ui> is what you paid into mutual fund SIPs this month. It lowers safe-to-spend like any payment, but
                it isn&apos;t counted as an expense or in category spending.
              </li>
              <li>
                <Ui>Savings goals</Ui> shows all-time progress for each goal you haven&apos;t archived.
              </li>
            </Bullets>
          </Section>

          <Section id="transactions" title="Log transactions" description="A transaction is money that actually moved: income or an expense.">
            <Bullets>
              <li>
                Press <Kbd>N</Kbd> or <Ui>Quick add</Ui> on the dashboard, enter the amount and category, and press <Kbd>Enter</Kbd>.
                The date defaults to today.
              </li>
              <li>
                Amounts are always positive. Whether money came in or went out depends only on the type you pick.
              </li>
              <li>Payment method and note are optional.</li>
              <li>
                The <PageLink href="/transactions">Transactions</PageLink> page lists the month&apos;s records, where you can edit or
                delete them.
              </li>
              <li>You can&apos;t log anything dated in the future.</li>
            </Bullets>
            <Alert>
              <InfoIcon />
              <AlertTitle>Got a refund?</AlertTitle>
              <AlertDescription>
                If the original expense is in an editable month, edit or delete it. If that month is locked, or it&apos;s cashback,
                log it as income under <Ui>Refunds &amp; cashback</Ui>.
              </AlertDescription>
            </Alert>
          </Section>

          <Section
            id="recurring"
            title="Bills, subscriptions, EMIs & SIPs"
            description="Recurring items (bills, subscriptions, EMIs and mutual fund SIPs) are set aside from safe-to-spend automatically until you mark them paid."
          >
            <p>Each recurring item shows one status per month:</p>
            <ul className="flex flex-col gap-2">
              <li className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 w-20 justify-center">Upcoming</Badge>
                <span>Not paid yet, and the due date hasn&apos;t passed.</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="destructive" className="mt-0.5 w-20 justify-center">Overdue</Badge>
                <span>Not paid, and the due date has passed. It still counts against safe-to-spend.</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5 w-20 justify-center">Paid</Badge>
                <span>An expense is linked to it for that month.</span>
              </li>
            </ul>
            <Bullets>
              <li>
                <Ui>Mark paid</Ui> creates one expense with the item&apos;s amount, category and default payment method. You can
                change the amount, date and method before saving. Safe-to-spend doesn&apos;t change, because the money was already
                set aside.
              </li>
              <li>
                <Ui>Unmark</Ui>, or deleting that expense on the Transactions page, makes the item unpaid again.
              </li>
              <li>
                Paid late? Use the real payment date. An October bill paid on 2 Nov shows &quot;Paid on 2 Nov&quot; in October, and
                the money counts in November&apos;s spending.
              </li>
              <li>A due day of 31 falls on the last day in shorter months.</li>
              <li>
                Nothing carries over: an unpaid October bill stays Overdue in October, and November only shows November&apos;s bill.
              </li>
            </Bullets>

            <h3 className="font-medium">EMIs</h3>
            <p>
              When a purchase is split into monthly installments (for example ₹30,000 as 3 × ₹10,000), add only the EMI, with an end
              month, and never log the full purchase. The dashboard shows &quot;Installment 2 of 3&quot; and how much is left. Use
              whatever amount your statement shows; the app doesn&apos;t calculate interest.
            </p>

            <Alert>
              <InfoIcon />
              <AlertTitle>Credit cards</AlertTitle>
              <AlertDescription>
                Log card purchases as expenses on the day you make them. Never log the credit card bill payment itself, or the same
                money would be counted twice.
              </AlertDescription>
            </Alert>

            <h3 className="font-medium">Stopping a recurring item</h3>
            <p>
              Use <Ui>End item</Ui> to set its last month. It disappears after that, and past months keep their history. You can only
              delete an item that has never been paid.
            </p>
          </Section>

          <Section id="goals" title="Savings goals" description="Money you put aside stops counting as spendable.">
            <Bullets>
              <li>
                Create a goal with <Ui>New goal</Ui>: a name, a target and an optional target date. With a date, the goal shows how
                much you need to save each month.
              </li>
              <li>
                <Ui>Deposit / withdraw</Ui> moves money in or out. A deposit lowers that month&apos;s safe-to-spend, a withdrawal
                raises it. You can&apos;t withdraw more than the goal holds.
              </li>
              <li>Contributions aren&apos;t spending and never appear in category totals.</li>
              <li>
                A <Badge variant="secondary">Reached</Badge> badge appears once deposits minus withdrawals hit the target. You can
                keep depositing past it.
              </li>
              <li>
                <Ui>Archive</Ui> hides a goal from the dashboard. You can only delete a goal that has no contributions.
              </li>
            </Bullets>
          </Section>

          <Section id="months" title="Months & locking">
            <Bullets>
              <li>
                Use <Ui>‹</Ui> and <Ui>›</Ui> next to the month name to look at past months. You can&apos;t go past the current month.
              </li>
              <li>The current month and the previous month are editable.</li>
              <li>
                Older months show{" "}
                <Badge variant="secondary">
                  <LockIcon data-icon="inline-start" />
                  Locked
                </Badge>{" "}
                and are read-only, so the history you&apos;ve checked against your bank statement stays put.
              </li>
              <li>&quot;Today&quot; is based on your timezone in Settings, not the server&apos;s clock.</li>
            </Bullets>
          </Section>

          <Section id="settings" title="Settings & your data">
            <Bullets>
              <li>
                <Ui>Currency</Ui> only changes how amounts are shown. Nothing is converted.
              </li>
              <li>
                <Ui>Timezone</Ui> decides what &quot;today&quot; is. Changing it never moves existing records.
              </li>
              <li>
                <Ui>Expense categories &amp; budgets</Ui>: add, rename or archive categories and set an optional monthly budget. It
                applies to every month. Bars turn amber at 80% and red over 100%. Paid bills, subscriptions and EMIs count toward
                their category&apos;s budget.
              </li>
              <li>
                <Ui>Payment methods</Ui> are labels only, with no balances. Use the pencil to change a method&apos;s type or bank name; past
                records show the new label. Archive one to hide it from pickers (it stays in this list, marked Archived, so you can
                restore it). You can only delete one that&apos;s never been used.
              </li>
              <li>
                <Ui>Security</Ui>: reveal or change your unique signature and change your password. Each needs your current password.
              </li>
              <li>
                <Ui>Export JSON</Ui> downloads everything in your account.
              </li>
            </Bullets>
          </Section>

          <Section id="faq" title="Common questions">
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="font-medium">Why is my safe-to-spend negative?</dt>
                <dd className="text-muted-foreground">
                  Usually because this month&apos;s income isn&apos;t logged yet, while unpaid bills are already set aside. Log your
                  salary when it arrives.
                </dd>
              </div>
              <div>
                <dt className="font-medium">I forgot my password.</dt>
                <dd className="text-muted-foreground">
                  On the login screen, choose <Ui>Forgot password?</Ui> and enter your username and unique signature. You&apos;ll be logged out
                  everywhere.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Can I add next month&apos;s salary in advance?</dt>
                <dd className="text-muted-foreground">
                  No. Only money that has actually moved is logged, so the number always reflects reality.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Is my data shared with anyone?</dt>
                <dd className="text-muted-foreground">No. Your data is private to your account.</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  )
}
