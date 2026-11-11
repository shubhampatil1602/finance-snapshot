# Finance Snapshot

A manual-first personal finance dashboard for one salaried person. It answers one question: "How much can I still spend this month?" Product scope and rules live in [PRD.md](PRD.md). This file is the shared vocabulary for code, UI, and conversation.

## Language

### Time

**Date**:
A calendar date stored as the string `YYYY-MM-DD`, with no time or timezone.
_Avoid_: timestamp, datetime

**Month**:
A string `YYYY-MM`, the first 7 characters of a Date. A record belongs to the Month of its Date.
_Avoid_: period, cycle, billing month

**Today**:
The current Date in the User's Timezone, never the server clock.
_Avoid_: now, server date

**Editable month**:
The current Month or the previous Month. Every older Month is **locked** (read-only).
_Avoid_: open month, active month

### Money movement

**Transaction**:
Money that actually moved on a Date that is Today or earlier. Either `income` or `expense`.
_Avoid_: entry, record, payment, spend

**Amount**:
A positive integer in minor units (paise/cents). Direction comes only from the Transaction's type or the Contribution's direction.
_Avoid_: value, sum, negative amount

**Refund**:
Not a type of its own. Handled either by editing or deleting the original expense, or by logging income under "Refunds & cashback".

**Payment method**:
A label for where an expense was paid from: a bank name plus `Debit card`, `Credit card`, `UPI`, or `Cash`. It has no balance.
_Avoid_: account, wallet, card, source

### Recurring

**Recurring item**:
A template for a payment that repeats every Month between its `startMonth` and optional `endMonth`.
_Avoid_: bill (as the umbrella term), schedule, rule

**Kind**:
How a Recurring item's money leaves: `bill`, `subscription`, or `emi`.
_Avoid_: type (reserved for income/expense), category

**EMI**:
A Recurring item that pays off a purchase in a fixed number of monthly installments. It always has an `endMonth`. The full purchase is never logged as an expense.
_Avoid_: loan, installment plan

**Payment status**:
The state of one Recurring item in one Month: **Paid**, **Upcoming**, or **Overdue**. It is worked out from the records each time, never stored.
_Avoid_: pending, due, unpaid (as a status name)

**Linked expense**:
The single expense with a `recurringId` and a `forMonth`. Its existence is what makes a Recurring item Paid for that Month.
_Avoid_: payment record, paid flag

**forMonth**:
The Month whose Recurring item a Linked expense pays. It can differ from the Month of the expense's Date when a bill is paid late.
_Avoid_: billing month, due month

### Classification

**Category**:
What money is for (Groceries, Entertainment, Salary). Every Transaction and Recurring item has exactly one.
_Avoid_: tag, label, kind

**Budget**:
An optional monthly limit on one expense Category. One current value applies to every Month.
_Avoid_: cap, allowance, plan

### Savings

**Goal**:
A named savings target with an optional target date.
_Avoid_: pot, envelope, fund

**Contribution**:
A `deposit` into or `withdraw` from a Goal. It is not a Transaction and never counts as spending.
_Avoid_: savings transaction, transfer

**Reached**:
A Goal whose all-time deposits minus withdrawals are ≥ its target. A derived badge, not a state.
_Avoid_: completed, done, closed

### Dashboard

**Snapshot**:
The dashboard for one Month, calculated live from records. It is never stored.
_Avoid_: report, statement, monthly record

**Safe to spend**:
For a Month: income − expenses − Upcoming and Overdue Recurring items − deposits + withdrawals.
_Avoid_: balance, remaining, available, free cash

### Lifecycle

**Archive**:
Hide something from pickers and the dashboard while keeping it on existing records and in history. It can be undone.
_Avoid_: deactivate, disable, soft delete

**End**:
Set a Recurring item's `endMonth`. It's the only way to stop one that has ever been Paid.
_Avoid_: cancel, deactivate, delete

### Accounts

**User**:
One person's account. All data is scoped to it.
_Avoid_: account (clashes with bank accounts), member, profile

**Unique signature**:
A recovery phrase the User picks. Together with the username, it resets a forgotten password.
_Avoid_: security answer, recovery key, PIN
