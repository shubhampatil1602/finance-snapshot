import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PencilIcon, PlusIcon, ReceiptIcon, SearchXIcon, Trash2Icon } from "lucide-react"
import { deleteTransactionAction } from "@/app/actions/transactions"
import { ActionButton } from "@/components/forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Money, MonthSwitcher, PageHeader } from "@/components/finance/display"
import { ListSkeleton } from "@/components/finance/skeletons"
import { TransactionDialog } from "@/components/finance/transaction-dialog"
import { TransactionFilters } from "@/components/finance/transaction-filters"
import { requireUser } from "@/lib/auth/dal"
import { getCategories, getPaymentMethods, getRecurringItems, getTransactionsForMonth } from "@/lib/data/queries"
import { listTransactions, pageWindow, parseTransactionListParams, transactionsHref } from "@/lib/domain/transaction-list"
import { firstDayOf, formatDateLabel, formatMonthLabel, isEditableMonth, monthOf, prevMonth, resolveMonthParam } from "@/lib/dates"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Transactions" }

async function Transactions({ searchParams }: { searchParams: PageProps<"/transactions">["searchParams"] }) {
  const user = await requireUser()
  const query = await searchParams
  const rawMonth = query.month
  const currentMonth = monthOf(user.today)
  const month = resolveMonthParam(rawMonth, user.today)
  const editable = isEditableMonth(month, user.today)

  const [transactions, categories, paymentMethods, recurring] = await Promise.all([
    getTransactionsForMonth(user._id, month),
    getCategories(user._id),
    getPaymentMethods(user._id),
    getRecurringItems(user._id),
  ])
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const methodLabel = new Map(paymentMethods.map((m) => [m.id, m.label]))
  const recurringName = new Map(recurring.map((r) => [r.id, r.name]))

  const usedCategoryIds = new Set(transactions.map((t) => t.categoryId))
  const usedMethodIds = new Set(transactions.flatMap((t) => (t.paymentMethodId ? [t.paymentMethodId] : [])))
  const params = parseTransactionListParams(query, month, { categoryIds: usedCategoryIds, methodIds: usedMethodIds })
  const { rows, total, page, pageCount, start } = listTransactions(transactions, params)
  const filtered = Boolean(params.q || params.category || params.method || params.date)
  const pageHref = (p: number) => transactionsHref(month, currentMonth, { ...params, page: p })
  const formProps = {
    categories,
    paymentMethods,
    today: user.today,
    minDate: firstDayOf(prevMonth(currentMonth)),
  }

  return (
    <>
      <PageHeader title="Transactions" description={editable ? "Money that actually moved this month." : "This month is locked and read-only."}>
        <MonthSwitcher month={month} currentMonth={currentMonth} basePath="/transactions" locked={!editable} />
        <TransactionDialog
          {...formProps}
          shortcut="n"
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          }
        />
      </PageHeader>

      {transactions.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon />
            </EmptyMedia>
            <EmptyTitle>No transactions in {formatMonthLabel(month)}</EmptyTitle>
            <EmptyDescription>
              {editable ? "Log your salary as income, then add expenses as you spend." : "Nothing was logged this month."}
            </EmptyDescription>
          </EmptyHeader>
          {editable && (
            <EmptyContent>
              <TransactionDialog
                {...formProps}
                trigger={
                  <Button variant="outline" size="sm">
                    <PlusIcon data-icon="inline-start" />
                    Log a transaction
                  </Button>
                }
              />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TransactionFilters
            key={month}
            month={month}
            currentMonth={currentMonth}
            categories={[...usedCategoryIds]
              .map((id) => ({ id, name: categoryName.get(id) ?? "—" }))
              .sort((a, b) => a.name.localeCompare(b.name))}
            methods={[...usedMethodIds]
              .map((id) => ({ id, label: methodLabel.get(id) ?? "—" }))
              .sort((a, b) => a.label.localeCompare(b.label))}
            activeDates={[...new Set(transactions.map((t) => t.date))]}
            params={params}
          />
          <p className="text-sm text-muted-foreground tabular-nums">
            {total === 0
              ? "No matches"
              : `${start + 1}–${start + rows.length} of ${total}${filtered ? ` (filtered from ${transactions.length})` : ""}`}
          </p>
        </div>
        {total === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>No transactions match these filters</EmptyTitle>
              <EmptyDescription>Try a different search, category, payment method or date.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" render={<Link href={transactionsHref(month, currentMonth, {})} />} nativeButton={false}>
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {editable && <TableHead className="w-24 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4 whitespace-nowrap">{formatDateLabel(t.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{categoryName.get(t.categoryId) ?? "—"}</span>
                        {t.note && <span className="text-xs text-muted-foreground md:hidden">{t.note}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-72 md:table-cell">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.recurringId && (
                          <Badge variant="secondary">
                            {recurringName.get(t.recurringId) ?? "Recurring"}
                            {t.forMonth && t.forMonth !== monthOf(t.date) ? ` · for ${formatMonthLabel(t.forMonth, "short")}` : ""}
                          </Badge>
                        )}
                        {t.paymentMethodId && <Badge variant="outline">{methodLabel.get(t.paymentMethodId)}</Badge>}
                        {t.note && <span className="truncate text-muted-foreground">{t.note}</span>}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right font-medium whitespace-nowrap", t.type === "income" && "text-success")}>
                      <Money amount={t.type === "income" ? t.amount : -t.amount} currency={user.currency} signed />
                    </TableCell>
                    {editable && (
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-1">
                          <TransactionDialog
                            {...formProps}
                            transaction={t}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label={`Edit transaction from ${formatDateLabel(t.date)}`}>
                                <PencilIcon />
                              </Button>
                            }
                          />
                          <ActionButton
                            action={deleteTransactionAction}
                            fields={{ id: t.id }}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete transaction from ${formatDateLabel(t.date)}`}
                            successMessage="Transaction deleted"
                            confirm={{
                              title: "Delete this transaction?",
                              description: t.recurringId
                                ? "This is a recurring payment. Deleting it marks the item unpaid again."
                                : "This can't be undone.",
                              actionLabel: "Delete",
                            }}
                          >
                            <Trash2Icon />
                          </ActionButton>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
        {pageCount > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref(page - 1)}
                  scroll={false}
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                  tabIndex={page === 1 ? -1 : undefined}
                />
              </PaginationItem>
              {pageWindow(page, pageCount).map((p, i) => (
                <PaginationItem key={p ?? `gap-${i}`}>
                  {p === null ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink href={pageHref(p)} scroll={false} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={pageHref(page + 1)}
                  scroll={false}
                  aria-disabled={page === pageCount}
                  className={page === pageCount ? "pointer-events-none opacity-50" : undefined}
                  tabIndex={page === pageCount ? -1 : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        </>
      )}
    </>
  )
}

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Transactions searchParams={searchParams} />
    </Suspense>
  )
}
