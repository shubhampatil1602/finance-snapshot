# Finance Snapshot

Answers one question at a glance: **"How much can I still spend this month?"**

Product rules are in [PRD.md](PRD.md); shared vocabulary is in [CONTEXT.md](CONTEXT.md).

## Stack

- Next.js 16 App Router (Cache Components + Partial Prefetching), React 19, TypeScript strict
- MongoDB (official driver), bcrypt passwords, AES-256-GCM encrypted recovery signature
- shadcn/ui (Base UI, `base-nova`) + Tailwind CSS v4
- Vitest (domain logic) and Playwright (end-to-end)

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in MONGODB_URI and SIGNATURE_KEY
pnpm dev
```

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name (default `finance_snapshot`) |
| `SIGNATURE_KEY` | 32-byte key (`openssl rand -base64 32`). Changing it makes stored signatures unreadable. |
| `SIGNUP_ENABLED` | Set to `false` to turn off sign-up (PRD §10). |

Indexes are created automatically on first connection.

## Scripts

```bash
pnpm dev         # development server
pnpm build       # production build
pnpm start       # serve the production build
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest: dates, money, recurring status, snapshot maths
pnpm build && npx playwright test   # E2E against a production build, using the finance_snapshot_test DB
```

## How it's put together

```
src/
  proxy.ts                 optimistic auth redirect (cookie present?) — not the real check
  app/
    (auth)/                login, register, forgot-password
    (app)/                 dashboard, transactions, recurring, goals, settings (+ error.tsx)
    actions/               Server Actions — every one re-checks the session and scopes by userId
    api/export/            JSON export (Route Handler)
  lib/
    auth/                  sessions (hashed tokens, HTTP-only cookie), DAL, rate limiting
    domain/                pure business rules: payment status, EMI installments, safe-to-spend
    data/                  server-only queries, always filtered by the logged-in user
    actions/helpers.ts     validation, date/lock rules, ownership checks, error mapping
  components/
    finance/               feature UI (Server Components + small client dialogs)
    ui/                    shadcn components
```

- **Server Components by default.** Pages read the session inside `<Suspense>`, so the static shell (header, nav, skeleton) is prerendered and the user's data streams in.
- **Client Components only for interaction:** dialogs, forms (`useActionState`), nav highlighting, and toasts.
- **Mutations are Server Actions.** They validate on the server (date ≤ today in the user's timezone, editable-month lock, positive integer amounts, EMI end month, withdrawal ≤ balance, ownership), then call `refresh()`.
- **Nothing derived is stored.** The Snapshot, Payment status and goal progress are computed from records each time. "Paid" means a linked expense exists. A unique partial index on `(userId, recurringId, forMonth)` prevents paying twice.
- **Money** is always integer minor units, parsed from strings without floating-point maths.

## Not in this MVP

JSON import (first item in the PRD cut order) and everything listed in PRD §7.
