import { expect, test, type Page } from "@playwright/test"

const uid = () => Math.random().toString(36).slice(2, 8)

async function register(page: Page, username: string) {
  await page.goto("/register")
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password").fill("correct-horse-1")
  await page.getByLabel("Unique signature").fill("my secret phrase")
  await expect(page.getByLabel("Timezone")).toHaveValue(/^Asia\/(Kolkata|Calcutta)$/)
  await page.getByRole("button", { name: "Create account" }).click()
  // First registration on a fresh database also creates indexes, so allow extra time.
  await expect(page.getByRole("heading", { name: "How much can I still spend?" })).toBeVisible({ timeout: 20_000 })
}

const safeToSpend = (page: Page) => page.locator("[aria-live=polite]").first()

async function submitDialog(page: Page, button: string) {
  const dialog = page.getByRole("dialog")
  await dialog.locator("button[type=submit]", { hasText: button }).click()
  await expect(dialog).toBeHidden()
}

test("setup a month, mark paid / unmark, goals, and isolation", async ({ page, browser }) => {
  const username = `e2e_${uid()}`
  await register(page, username)

  // With nothing logged and a recurring bill, safe-to-spend is negative (checked below once rent exists).
  await expect(safeToSpend(page)).toHaveText("₹0")

  // Quick add salary: open, switch to income, type amount, Enter.
  await page.getByRole("button", { name: /Quick add/ }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Income" }).click()
  await dialog.getByLabel("Amount").fill("85000")
  await dialog.getByLabel("Amount").press("Enter")
  await expect(dialog).toBeHidden()
  await expect(safeToSpend(page)).toHaveText("₹85,000")

  // Rent, due on the 5th, already paid (today is after the 5th in this test's clock).
  await page.goto("/recurring")
  await page.getByRole("button", { name: "Add recurring item" }).click()
  let d = page.getByRole("dialog")
  await d.getByLabel("Name").fill("Rent")
  await d.getByLabel("Amount").fill("25000")
  await d.getByLabel("Due day").fill("1")
  await d.getByLabel("Category").selectOption({ label: "Housing" })
  await d.getByText("Already paid this month").click()
  await submitDialog(page, "Add recurring item")

  // Netflix subscription due on the 28th: still upcoming.
  await page.getByRole("button", { name: "Add recurring item" }).click()
  d = page.getByRole("dialog")
  await d.getByLabel("Name").fill("Netflix")
  await d.getByLabel("Kind").selectOption("subscription")
  await d.getByLabel("Amount").fill("649")
  await d.getByLabel("Due day").fill("28")
  await d.getByLabel("Category").selectOption({ label: "Entertainment" })
  await submitDialog(page, "Add recurring item")

  // 85,000 − 25,000 (paid rent) − 649 (upcoming Netflix) = 59,351
  await page.goto("/")
  await expect(safeToSpend(page)).toHaveText("₹59,351")
  await expect(page.getByText("Paid on")).toBeVisible()

  // Mark Netflix paid: safe-to-spend unchanged. Unmark reverses exactly.
  const netflix = page.locator("li", { hasText: "Netflix" })
  await netflix.getByRole("button", { name: "Mark paid" }).click()
  await submitDialog(page, "Mark paid")
  await expect(netflix.getByText("Paid", { exact: true })).toBeVisible()
  await expect(safeToSpend(page)).toHaveText("₹59,351")

  // Paying twice for the same month is impossible from the UI (button gone) — and rejected server-side (unique index).
  await expect(netflix.getByRole("button", { name: "Mark paid" })).toHaveCount(0)

  await netflix.getByRole("button", { name: "Unmark" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Unmark" }).click()
  await expect(page.getByRole("alertdialog")).toBeHidden()
  await expect(netflix.getByText("Upcoming")).toBeVisible()
  await expect(safeToSpend(page)).toHaveText("₹59,351")

  // Deleting rent's linked expense makes it unpaid again (and Overdue, since its due date passed).
  await page.goto("/transactions")
  const rentRow = page.getByRole("row", { name: /Rent/ })
  await rentRow.getByRole("button", { name: "Delete" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByText("Transaction deleted")).toBeVisible()
  await expect(page.getByRole("alertdialog")).toBeHidden()
  await expect(page.getByRole("row", { name: /Rent/ })).toHaveCount(0)
  await page.goto("/")
  await expect(page.locator("li", { hasText: "Rent" }).getByText("Overdue")).toBeVisible()
  await expect(safeToSpend(page)).toHaveText("₹59,351")

  // A paid bill can't be deleted, only ended: pay rent again, then check Delete is gone.
  await page.locator("li", { hasText: "Rent" }).getByRole("button", { name: "Mark paid" }).click()
  await submitDialog(page, "Mark paid")
  await page.goto("/recurring")
  await expect(page.getByRole("button", { name: "Delete Rent" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Delete Netflix" })).toBeVisible()

  // Goals: deposit reduces safe-to-spend; over-withdrawal is rejected.
  await page.goto("/goals")
  await page.getByRole("button", { name: "New goal" }).click()
  d = page.getByRole("dialog")
  await d.getByLabel("Name").fill("Emergency fund")
  await d.getByLabel("Target", { exact: true }).fill("100000")
  await submitDialog(page, "Create goal")
  await page.getByRole("button", { name: "Deposit / withdraw" }).click()
  d = page.getByRole("dialog")
  await d.getByLabel("Amount").fill("10000")
  await submitDialog(page, "Deposit")
  await page.getByRole("button", { name: "Deposit / withdraw" }).click()
  d = page.getByRole("dialog")
  await d.getByRole("button", { name: "Withdraw" }).click()
  await d.getByLabel("Amount").fill("20000")
  await d.locator("button[type=submit]").click()
  await expect(d.getByText("You can't withdraw more than the goal holds.")).toBeVisible()
  await expect(d.getByLabel("Amount")).toHaveValue("20000") // input kept after a server error
  await page.keyboard.press("Escape")

  await page.goto("/")
  await expect(safeToSpend(page)).toHaveText("₹49,351")
  await expect(page.getByText("Emergency fund")).toBeVisible()

  // Future months are not browsable: next is disabled on the current month.
  await expect(page.getByRole("button", { name: "Next month" })).toBeDisabled()

  // Isolation: a second user sees none of this.
  const other = await browser.newContext({ timezoneId: "Asia/Kolkata" })
  const page2 = await other.newPage()
  await register(page2, `e2e_${uid()}`)
  const exported = await (await page2.request.get("/api/export")).json()
  expect(exported.transactions).toHaveLength(0)
  expect(exported.goals).toHaveLength(0)
  expect(JSON.stringify(exported)).not.toMatch(/passwordHash|signatureEnc|my secret phrase/)
  await other.close()

  // Our own export has our data, still without secrets.
  const mine = await (await page.request.get("/api/export")).json()
  expect(mine.transactions.length).toBeGreaterThanOrEqual(2)
  expect(JSON.stringify(mine)).not.toMatch(/passwordHash|signatureEnc|my secret phrase/)
})

test("auth: duplicate username, signature rules, forgot password logs out sessions", async ({ page, browser }) => {
  const username = `e2e_${uid()}`
  await register(page, username)

  // Duplicate username in a different case.
  const ctx = await browser.newContext({ timezoneId: "Asia/Kolkata" })
  const p2 = await ctx.newPage()
  await p2.goto("/register")
  await p2.getByLabel("Username").fill(username.toUpperCase())
  await p2.getByLabel("Password").fill("another-pass-1")
  await p2.getByLabel("Unique signature").fill("other phrase 123")
  await p2.getByRole("button", { name: "Create account" }).click()
  await expect(p2.getByText("That username is taken.")).toBeVisible()

  // Signature equal to the username is rejected.
  await p2.getByLabel("Username").fill(`e2e_${uid()}x`)
  const name = await p2.getByLabel("Username").inputValue()
  await p2.getByLabel("Unique signature").fill(name.toUpperCase())
  await p2.getByRole("button", { name: "Create account" }).click()
  await expect(p2.getByText("Signature can't be the same as your username.").first()).toBeVisible()

  // Wrong signature: one generic error.
  await p2.goto("/forgot-password")
  await p2.getByLabel("Username").fill(username)
  await p2.getByLabel("Unique signature").fill("wrong phrase!")
  await p2.getByLabel("New password").fill("brand-new-pass-1")
  await p2.getByRole("button", { name: "Reset password" }).click()
  await expect(p2.getByText("That username and signature don't match.")).toBeVisible()

  // Right signature: password replaced, all sessions logged out.
  await p2.getByLabel("Unique signature").fill("my secret phrase")
  await p2.getByRole("button", { name: "Reset password" }).click()
  await expect(p2.getByText("Password changed.")).toBeVisible()

  await page.goto("/")
  await expect(page).toHaveURL(/\/login/)

  // New password works.
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password").fill("brand-new-pass-1")
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "How much can I still spend?" })).toBeVisible()

  // Reveal signature requires the current password.
  await page.goto("/settings")
  await page.getByPlaceholder("Current password").fill("brand-new-pass-1")
  await page.getByRole("button", { name: "Reveal" }).click()
  await expect(page.getByText("my secret phrase")).toBeVisible()
  await ctx.close()
})

test("server rejects locked months, future dates and other users' ids", async ({ page, browser }) => {
  // User A logs an expense and exposes its id via export.
  await register(page, `e2e_${uid()}`)
  await page.getByRole("button", { name: /Quick add/ }).click()
  await page.getByRole("dialog").getByLabel("Amount").fill("100")
  await page.getByRole("dialog").getByLabel("Amount").press("Enter")
  await expect(page.getByRole("dialog")).toBeHidden()
  const victim = (await (await page.request.get("/api/export")).json()).transactions[0].id as string

  // Bypass the browser's min/max to hit the server rules directly.
  const tryDate = async (date: string) => {
    await page.getByRole("button", { name: /Quick add/ }).click()
    const d = page.getByRole("dialog")
    await d.getByLabel("Amount").fill("50")
    await d.getByLabel("Date").evaluate((el, v) => {
      el.removeAttribute("min")
      el.removeAttribute("max")
      ;(el as HTMLInputElement).value = v
    }, date)
    await d.locator("button[type=submit]").click()
    return d
  }
  const today = new Date()
  const twoMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 10)).toISOString().slice(0, 10)
  let d = await tryDate(twoMonthsAgo)
  await expect(d.getByText("That month is locked.", { exact: false })).toBeVisible()
  await page.keyboard.press("Escape")
  d = await tryDate("2099-01-01")
  await expect(d.getByText("Date can't be in the future.")).toBeVisible()
  await page.keyboard.press("Escape")

  // User B swaps A's id into their own delete form: rejected, A's data intact.
  const ctx = await browser.newContext({ timezoneId: "Asia/Kolkata" })
  const p2 = await ctx.newPage()
  await register(p2, `e2e_${uid()}`)
  await p2.getByRole("button", { name: /Quick add/ }).click()
  await p2.getByRole("dialog").getByLabel("Amount").fill("1")
  await p2.getByRole("dialog").getByLabel("Amount").press("Enter")
  await expect(p2.getByRole("dialog")).toBeHidden()
  await p2.goto("/transactions")
  await p2.getByRole("button", { name: "Delete" }).click()
  const confirm = p2.getByRole("alertdialog")
  await confirm.locator("input[name=id]").evaluate((el, id) => ((el as HTMLInputElement).value = id), victim)
  await confirm.getByRole("button", { name: "Delete" }).click()
  await expect(p2.getByText("Transaction not found.")).toBeVisible()
  await ctx.close()

  const after = (await (await page.request.get("/api/export")).json()).transactions as { id: string }[]
  expect(after.map((t) => t.id)).toContain(victim)
})
