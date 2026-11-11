import { Suspense } from "react"
import type { Metadata } from "next"
import { ArchiveIcon, ArchiveRestoreIcon, DownloadIcon, Trash2Icon } from "lucide-react"
import { deletePaymentMethodAction, setCategoryArchivedAction, setPaymentMethodArchivedAction } from "@/app/actions/settings"
import { ActionButton } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/finance/display"
import {
  AddCategoryForm,
  AddPaymentMethodForm,
  CategoryRowForm,
  ChangePasswordForm,
  ChangeSignatureForm,
  PaymentMethodRow,
  ProfileForm,
  RevealSignature,
} from "@/components/finance/settings-forms"
import { ListSkeleton } from "@/components/finance/skeletons"
import { requireUser } from "@/lib/auth/dal"
import { getCategories, getPaymentMethods, getUsedPaymentMethodIds } from "@/lib/data/queries"
import { listTimeZones, matchTimeZone } from "@/lib/timezones"
import type { Category } from "@/lib/types"

export const metadata: Metadata = { title: "Settings" }

function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {categories.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start gap-2">
          {c.archived ? (
            <span className="flex h-8 flex-1 items-center gap-2 text-sm text-muted-foreground">
              {c.name} <Badge variant="secondary">Archived</Badge>
            </span>
          ) : (
            <CategoryRowForm category={c} />
          )}
          <ActionButton
            action={setCategoryArchivedAction}
            fields={{ id: c.id, archived: String(!c.archived) }}
            variant="ghost"
            size="icon"
            aria-label={c.archived ? `Unarchive ${c.name}` : `Archive ${c.name}`}
            successMessage={c.archived ? "Category restored" : "Category archived"}
          >
            {c.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
          </ActionButton>
        </li>
      ))}
    </ul>
  )
}

async function Settings() {
  const user = await requireUser()
  const [categories, paymentMethods, usedMethods] = await Promise.all([
    getCategories(user._id),
    getPaymentMethods(user._id),
    getUsedPaymentMethodIds(user._id),
  ])
  const expense = categories.filter((c) => c.type === "expense")
  const income = categories.filter((c) => c.type === "income")
  const timeZones = listTimeZones(user.timezone)

  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${user.username}`} />

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm currency={user.currency} timezone={matchTimeZone(timeZones, user.timezone)} timeZones={timeZones} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense categories & budgets</CardTitle>
            <CardDescription>
              Optional monthly budget per category. It applies to every month. Bars turn amber at 80% and red over 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CategoryList categories={expense} />
            <Separator />
            <AddCategoryForm type="expense" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Income categories</CardTitle>
              <CardDescription>Log refunds for locked months and cashback under &quot;Refunds & cashback&quot;.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CategoryList categories={income} />
              <Separator />
              <AddCategoryForm type="income" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
              <CardDescription>Labels only — no balances. Archived methods stay listed here but are hidden from pickers; restore one with its unarchive button.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {paymentMethods.length > 0 && (
                <ul className="flex flex-col divide-y rounded-lg border">
                  {paymentMethods.map((m) => (
                    <PaymentMethodRow
                      key={m.id}
                      method={m}
                      actions={
                        <>
                          <ActionButton
                            action={setPaymentMethodArchivedAction}
                            fields={{ id: m.id, archived: String(!m.archived) }}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={m.archived ? `Unarchive ${m.label}` : `Archive ${m.label}`}
                            successMessage={m.archived ? "Payment method restored" : "Payment method archived"}
                          >
                            {m.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                          </ActionButton>
                          {!usedMethods.has(m.id) && (
                            <ActionButton
                              action={deletePaymentMethodAction}
                              fields={{ id: m.id }}
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${m.label}`}
                              successMessage="Payment method deleted"
                              confirm={{ title: `Delete ${m.label}?`, description: "It has never been used.", actionLabel: "Delete" }}
                            >
                              <Trash2Icon />
                            </ActionButton>
                          )}
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
              <AddPaymentMethodForm />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Each change needs your current password.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Unique signature</h3>
            <RevealSignature />
          </section>
          <Separator />
          <ChangeSignatureForm />
          <Separator />
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Download everything in your account as JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<a href="/api/export" download />} nativeButton={false}>
            <DownloadIcon data-icon="inline-start" />
            Export JSON
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={10} />}>
      <Settings />
    </Suspense>
  )
}
