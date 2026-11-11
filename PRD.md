# Finance Snapshot — PRD (v1)

**Status:** Ready to build · **Appetite:** 1 week · **Stack:** Next.js + TypeScript, MongoDB, basic username/password auth

---

## 1. Problem

A salaried person gets paid once a month, but by mid-month they can't say how much money they can still spend. Money already spent, bills not yet paid, subscriptions, EMIs, and what they meant to save live in different places (bank app, notes, memory). So they either overspend and dip into savings, or under-spend and feel anxious anyway.

**Finance Snapshot answers one question at a glance: "How much can I still spend this month?"**

## 2. Who it's for

One salaried individual with predictable monthly income, managing their own money, on a laptop. Each person has their own account and private data. No shared or household accounts.

## 3. Success metrics

| Metric | Target |
| --- | --- |
| Time to set up a month from empty (income, bills/subs, one goal, see safe-to-spend) | < 10 min |
| Time to log one expense | < 15 s |
| Retention | Used at least weekly for one full month |
| Accuracy | Month-end totals match the user's bank statement within 2% |

Use these to judge new feature requests: if a feature doesn't help one of them, it waits.

## 4. Terms

All domain terms (Month, Editable month, Transaction, Recurring item, Kind, Payment status, Linked expense, Contribution, Safe to spend, Snapshot, …) are defined in [CONTEXT.md](CONTEXT.md). Use those words in the UI, the code, and conversation.

## 5. Solution (v1 scope)

### 5.0 Accounts (basic auth)

- **Register** with:
  - `username`: unique, case-insensitive, 3–32 chars.
  - `password`: min 8 chars.
  - `unique_signature`: a recovery phrase, min 8 chars. Must not equal the username (case-insensitive) or the password. It does **not** need to be unique across users, because recovery always pairs it with the username, and a "taken" error would leak another user's secret.
  - `timezone`: pre-filled from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`), editable.
  - Registering seeds the default categories (§5.6).
- **Log in / log out.** Session kept in an HTTP-only, secure cookie.
- **Forgot password:** on the login screen, the user enters username + unique_signature + new password. On a match, the password is replaced and all of that user's sessions are logged out. A wrong pair gives one generic error.
- **Settings → Security:** view the signature (masked, "Reveal" toggle), edit it, change the password. All of these require the current password.
- **Storage:**
  - Password: hashed with bcrypt or argon2.
  - Signature: encrypted at rest with AES-256-GCM, key in an env var. Not hashed, because it must be viewable.
  - Neither is ever logged or returned, except the signature on the reveal call.
- Every query is scoped to the logged-in user.
- Rate-limit login and forgot-password (e.g. 5 failures per minute per username).
- Out: email, OAuth/social login, 2FA, account deletion UI.

### 5.1 Dashboard (home)

Shows the **selected month** (default: current month). The month switcher (‹ prev / next ›) goes back to any month, and **next stops at the current month**. Locked months are read-only.

**Safe to spend** for month `M`:

```
  income dated in M
− expenses dated in M
− amounts of recurring items that apply to M and are not Paid (Upcoming + Overdue)
− goal deposits dated in M
+ goal withdrawals dated in M
```

- **Salary is logged manually** each month as an income transaction. Recurring items are outflows only, with no income templates.
- Only income actually logged counts. There is no "expected income". If salary is late or short, the number goes negative and shows in red. This is intended.
- **Expenses dated in M** includes late payments for earlier months' bills (§5.3).

The dashboard also shows:
- Totals: income, expenses, saved (deposits − withdrawals) this month.
- **Recurring items for M:** grouped by kind (bills / subscriptions / EMIs) with a subtotal each, sorted by due day, showing status and a "Mark paid" action.
- **Spending by category:** with budget progress where a budget is set (§5.6).
- **Savings goals:** all-time progress for each unarchived goal.

### 5.2 Transactions (manual entry)

- Fields: type (`income`/`expense`), amount, date (default today), category (matching type), payment method (optional, expenses only), note (optional).
- **Amount** is always positive, stored as integer minor units (₹499.50 → `49950`). Direction comes from `type` only. Negative amounts are rejected.
- **Date** must be ≤ today and inside an editable month. Create, edit, and delete are all rejected for locked months, enforced on the server.
- **Refunds:**
  - Refund in an editable month: edit or delete the original expense.
  - Refund in a locked month, or cashback: log as income under **"Refunds & cashback"**.
  - There's no refund type.
- Quick-add form reachable from the dashboard in one click, keyboard-friendly (Enter submits).
- List view for the month, with edit and delete for editable months.

### 5.3 Recurring items (bills, subscriptions, EMIs)

**Fields:** name, kind (`bill` | `subscription` | `emi`), amount, due day (1–31), expense category (required), default payment method (optional), `startMonth` (defaults to the month you create it in), `endMonth` (optional; **required for `emi`**).

**When it applies:** in month `M` only if `startMonth ≤ M ≤ endMonth` (no end = runs on with no end date). The effective due date is `min(dueDay, last day of M)`.

**Payment status for month M:**

| Status | Rule |
| --- | --- |
| **Paid** | A linked expense exists with this `recurringId` and `forMonth = M` |
| **Upcoming** | Not paid, M is the current month, and today ≤ effective due date |
| **Overdue** | Not paid, and the due date has passed (any unpaid item in a past month is Overdue). Shown in red. |

- Upcoming and Overdue both count against safe-to-spend.
- **Nothing carries over:** an unpaid October bill stays Overdue in October. November shows only November's bill.

**Mark paid:**
- Creates **one** expense with `recurringId`, `forMonth = M`, the item's amount, category, and default payment method. Amount, date, and payment method can be changed before saving.
- **Date** = the real payment date. It must be ≥ the first day of M, ≤ today, and in an editable month. A late payment (October bill paid 2 Nov) counts in **November's** totals, and the October item shows "Paid on 2 Nov".
- `forMonth` must also be an editable month.
- A unique index on `(userId, recurringId, forMonth)` prevents paying twice in the same month.
- **Unmark** = delete that expense. Deleting the expense from the transactions list does the same.
- Editing the expense's amount, category, payment method, or note keeps it paid.

**Lifecycle:**
- **Edit amount:** affects months that aren't paid. Paid months keep the amount of their linked expense.
- **End:** set `endMonth`. The item is kept, so history is unchanged.
- **Delete:** only if it has **never** been paid. Otherwise end it.

**"Already paid this month" checkbox** on the add form, shown when the current month's due date has passed. Ticking it runs Mark paid immediately, dated the due date (editable). This is for first-time setup, when bills were paid before you joined.

**EMI:**
- Use it when a purchase is split into monthly installments (e.g. ₹30k on a credit card → 3 × ₹10k).
- Log **only** the EMI item, **never** the full purchase.
- Shows "Installment n of N" and the amount remaining (remaining installments × amount).
- The amount is whatever the statement shows. The app does no interest maths.

**Credit cards:**
- Credit card purchases count as expenses on the day they're made, like any other payment method.
- **The credit card bill payment is never logged.** The add-recurring form warns about this when a credit card payment method is chosen.

### 5.4 Payment methods

- A list each user manages under Settings. Each entry has:
  - `type`: `Debit card` | `Credit card` | `UPI` | `Cash`
  - `name`: the bank name, required except for Cash
  - The label is shown as e.g. "HDFC · Credit card".
- Optional on every expense. Each recurring item has an optional default that pre-fills Mark paid.
- **Archive** hides a method from pickers but keeps it on existing records. **Delete** is only allowed if it's never been used.
- No balances, no transfers between methods.

### 5.5 Savings goals

- **Fields:** name, target amount, optional target date.
- **Contributions:** `direction` (`deposit` | `withdraw`), amount (positive), date, goal.
  - Not transactions. They never appear in spending or category totals.
  - Same date rules as transactions: ≤ today, editable months only.
  - A withdrawal can't take the goal's balance below 0.
- **Progress** = all-time deposits − withdrawals, shown against the target.
- **Reached:** a badge appears automatically when progress ≥ target. Deposits can continue past 100%.
- **Archive / unarchive** at any time. Hides the goal from the dashboard, and its contributions still count in their months.
- **Delete** only if the goal has no contributions.
- **Target date:** display only, e.g. "₹4,000/month needed to reach by Mar". No reminders.

### 5.6 Categories & budgets

- **Default expense categories:** Housing, Groceries, Dining, Transport, Utilities, Health, Shopping, Entertainment, Other. There's no "Subscriptions" category, because that's a kind.
- **Default income categories:** Salary, Refunds & cashback, Other income.
- The user can add, rename, and archive categories. An archived category can't be picked for new records, and existing records keep it.
- **Optional monthly budget** per expense category:
  - **Spent** = all expenses in that category dated in M, including bill, subscription, and EMI payments. Contributions are excluded, and so are unpaid recurring items.
  - **One current limit** per category, used for every month, including past months. No limit history.
  - The bar turns amber at 80% and red over 100%.

### 5.7 Settings

- Currency: chosen once (e.g. INR, USD), formatting only, no conversion.
- Timezone: editable. Changing it changes what "today" is. It never moves existing records.
- Payment methods (§5.4).
- Security (§5.0).
- JSON export of all the user's data. JSON import is optional (see cut order).

## 6. Data model (MongoDB, sketch — not prescriptive)

```
User          { _id, username (lowercased, unique), passwordHash, signatureEnc, timezone, currency, createdAt }
Session       { _id, userId, expiresAt }   // TTL index; or a signed cookie, engineering's call
PaymentMethod { _id, userId, type: debit_card|credit_card|upi|cash, name?, archived }
Category      { _id, userId, name, type: income|expense, monthlyBudget?, archived }
Recurring     { _id, userId, name, kind: bill|subscription|emi, amount, dueDay, categoryId,
                paymentMethodId?, startMonth: "YYYY-MM", endMonth?: "YYYY-MM" }
Transaction   { _id, userId, type: income|expense, amount, date: "YYYY-MM-DD", categoryId,
                paymentMethodId?, note?, recurringId?, forMonth?: "YYYY-MM", createdAt, updatedAt }
Goal          { _id, userId, name, target, targetDate?, archived }
Contribution  { _id, userId, goalId, direction: deposit|withdraw, amount, date: "YYYY-MM-DD" }
```

- All amounts are integer minor units.
- There's no `RecurringPaid` collection. "Paid" means a linked transaction exists.
- Indexes:
  - `{ userId, date }` on Transaction and Contribution
  - unique partial `{ userId, recurringId, forMonth }` on Transaction (where `recurringId` exists)
  - `{ userId }` on the rest
- Every write is a single document, so no multi-document transactions are needed.
- Server-side validation enforces: date ≤ today (user timezone), editable-month lock, positive amounts, `endMonth` required for `emi`, `endMonth ≥ startMonth`, withdrawal ≤ goal balance.

## 7. Non-goals (v1)

- **CSV import**: v1.1 (§8). No CSV fields or code in v1.
- Bank integrations, open banking, statement sync
- Invoice/receipt upload, OCR
- Financial advice, recommendations, insights copy
- Tax logic, investments, net worth, loan or credit card balances, interest calculation
- Auth beyond username/password/signature: email, OAuth, 2FA
- Shared/household accounts
- Multi-currency, conversion
- Future-dated transactions, browsing future months, forecasting, expected income, recurring income templates
- Cross-month trends/charts
- Budget limit history, refund transaction type
- Notifications or reminders
- Native mobile. The mobile layout only needs to stay usable.

## 8. v1.1: CSV import (not built in v1)

- Fixed template: `date (YYYY-MM-DD), description, amount, type (income|expense, optional), category (optional)`. Downloadable sample.
- v1 records without `source`/`importBatchId` count as manual, so v1.1 adds these fields without a migration.
- **To decide before v1.1:**
  1. **Bill double-counting:** if a CSV row is a payment for a recurring item that's still unpaid, how is it linked (suggest a match, user confirms)?
  2. **Locked months:** reject rows older than the previous month, or allow imports to bypass the lock?
  3. **Duplicates:** how to detect rows that are already logged (same date + amount + description?).
  4. **Preview before commit**, invalid-row handling, undo by import batch.

## 9. Cut order (if the week runs short)

Cut from the top first:

1. JSON import (keep export)
2. Goal target date and "needed per month"
3. Payment methods
4. Per-category budgets
5. Editing the previous month (only the current month stays editable)

**Must not be cut:**
- Register/login/forgot-password with per-user isolation
- Safe-to-spend
- Quick-add
- Recurring items (all three kinds) with mark-paid and the "already paid" checkbox
- Goals with deposit/withdraw
- Month switcher

## 10. Open questions

1. **Open sign-up:** can anyone with the URL register? Recommend an env flag to turn sign-up off.

## 11. Acceptance checks

**Auth**
- [ ] Registering with a taken username (any letter case) fails with a clear message.
- [ ] Registration is rejected when unique_signature equals the username (any case) or the password.
- [ ] Forgot password with the correct username + signature sets the new password and logs out old sessions. A wrong pair gives one generic error.
- [ ] The signature is encrypted in the DB and revealed only after the current password is entered.
- [ ] Logged-out requests redirect to login, or return 401.
- [ ] User A cannot read or modify User B's data by guessing IDs (test via API).
- [ ] Password hashes and signatures never appear in logs or responses.

**Dates & months**
- [ ] With timezone Asia/Kolkata, an expense entered at 23:30 on 31 Oct (local time) lands in October.
- [ ] Creating, editing, or deleting anything dated two months ago is rejected by the API.
- [ ] A future date is rejected. "Next ›" is disabled on the current month.

**Recurring**
- [ ] A bill created in November does not appear in October.
- [ ] Ending a bill in December keeps it in November's history.
- [ ] A bill with due day 31 is due on 28/29 Feb.
- [ ] Marking a bill paid creates one expense and leaves safe-to-spend unchanged. Unmarking reverses it exactly.
- [ ] Deleting the linked expense makes the bill unpaid again.
- [ ] Paying the same bill twice for the same month is rejected.
- [ ] October's bill paid on 2 Nov: October shows "Paid on 2 Nov". The amount counts in November's expenses, not October's.
- [ ] An unpaid bill whose due date has passed shows Overdue and still reduces safe-to-spend.
- [ ] An EMI without an end month is rejected. A 3-month EMI shows "Installment 2 of 3" in its second month and doesn't appear in its fourth.
- [ ] A bill that has ever been paid cannot be deleted, only ended.

**Goals & budgets**
- [ ] A withdrawal increases safe-to-spend for its month. A withdrawal larger than the goal balance is rejected.
- [ ] Contributions don't appear in spending by category.
- [ ] A goal with contributions cannot be deleted.
- [ ] A paid EMI in Shopping counts toward the Shopping budget. An unpaid one doesn't.

**Setup & speed**
- [ ] From a fresh account, a user can add salary, 3 bills, 2 subscriptions, 1 goal (using "already paid" where due), and see a correct safe-to-spend in under 10 min.
- [ ] Quick-add an expense in ≤ 3 interactions and < 15 s.
- [ ] With no income logged, safe-to-spend is negative and red.
- [ ] Hand-computed totals for a seeded month match the dashboard to the paisa.
