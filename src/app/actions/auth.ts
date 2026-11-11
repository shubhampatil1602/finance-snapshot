"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { ObjectId } from "mongodb"
import { collections, isDuplicateKeyError } from "@/lib/db"
import { env } from "@/lib/env"
import {
  burnPasswordCheck,
  decryptSignature,
  encryptSignature,
  hashPassword,
  safeEqual,
  verifyPassword,
} from "@/lib/crypto"
import { createSession, destroyAllSessions, destroyCurrentSession } from "@/lib/auth/session"
import { requireUserForMutation } from "@/lib/auth/dal"
import { isRateLimited, recordFailure, RATE_LIMIT_MESSAGE } from "@/lib/auth/rate-limit"
import { isValidTimeZone } from "@/lib/dates"
import { ActionError, runAction, str } from "@/lib/actions/helpers"
import type { ActionState, CategoryDoc } from "@/lib/types"

const DEFAULT_EXPENSE = ["Housing", "Groceries", "Dining", "Transport", "Utilities", "Health", "Shopping", "Entertainment", "Investments", "Other"]
const DEFAULT_INCOME = ["Salary", "Refunds & cashback", "Other income"]

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be 3–32 characters.")
  .max(32, "Username must be 3–32 characters.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, dashes or underscores.")
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(200)
const signatureSchema = z.string().min(8, "Signature must be at least 8 characters.").max(200)

function firstIssue(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    fieldErrors[key] ??= issue.message
  }
  return { ok: false, error: error.issues[0]?.message, fieldErrors }
}

/** Signature must not equal the username (any case) or the password. */
function signatureClash(signature: string, username: string, password: string): string | null {
  if (signature.toLowerCase() === username.toLowerCase()) return "Signature can't be the same as your username."
  if (signature === password) return "Signature can't be the same as your password."
  return null
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!env.signupEnabled) return { ok: false, error: "Sign-up is turned off." }

  const parsed = z
    .object({
      username: usernameSchema,
      password: passwordSchema,
      signature: signatureSchema,
      timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
    })
    .safeParse({
      username: str(form, "username"),
      password: form.get("password") ?? "",
      signature: form.get("signature") ?? "",
      timezone: str(form, "timezone") || "UTC",
    })
  if (!parsed.success) return firstIssue(parsed.error)

  const { password, signature, timezone } = parsed.data
  const username = parsed.data.username.toLowerCase()
  const clash = signatureClash(signature, username, password)
  if (clash) return { ok: false, error: clash, fieldErrors: { signature: clash } }

  const { users, categories } = await collections()
  const userId = new ObjectId()
  try {
    await users.insertOne({
      _id: userId,
      username,
      passwordHash: await hashPassword(password),
      signatureEnc: encryptSignature(signature),
      timezone,
      currency: "INR",
      createdAt: new Date(),
    })
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const msg = "That username is taken."
      return { ok: false, error: msg, fieldErrors: { username: msg } }
    }
    throw err
  }

  const seed: CategoryDoc[] = [
    ...DEFAULT_EXPENSE.map((name) => ({ _id: new ObjectId(), userId, name, type: "expense" as const, archived: false })),
    ...DEFAULT_INCOME.map((name) => ({ _id: new ObjectId(), userId, name, type: "income" as const, archived: false })),
  ]
  await categories.insertMany(seed)
  await createSession(userId)
  redirect("/")
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const username = str(form, "username").toLowerCase()
  const password = String(form.get("password") ?? "")
  const generic: ActionState = { ok: false, error: "Wrong username or password." }
  if (!username || !password) return generic

  const limitKey = `login:${username}`
  if (await isRateLimited(limitKey)) return { ok: false, error: RATE_LIMIT_MESSAGE }

  const { users } = await collections()
  const user = await users.findOne({ username }, { projection: { passwordHash: 1 } })
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false)
  if (!user || !valid) {
    await recordFailure(limitKey)
    return generic
  }

  await createSession(user._id)
  redirect("/")
}

export async function logoutAction() {
  await destroyCurrentSession()
  redirect("/login")
}

export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const username = str(form, "username").toLowerCase()
  const signature = String(form.get("signature") ?? "")
  const newPassword = String(form.get("newPassword") ?? "")
  const generic: ActionState = { ok: false, error: "That username and signature don't match." }

  const pw = passwordSchema.safeParse(newPassword)
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message, fieldErrors: { newPassword: pw.error.issues[0].message } }
  if (!username || !signature) return generic

  const limitKey = `forgot:${username}`
  if (await isRateLimited(limitKey)) return { ok: false, error: RATE_LIMIT_MESSAGE }

  const { users } = await collections()
  const user = await users.findOne({ username }, { projection: { signatureEnc: 1 } })
  const match = user ? safeEqual(decryptSignature(user.signatureEnc), signature) : false
  if (!user || !match) {
    await recordFailure(limitKey)
    return generic
  }
  const clash = signatureClash(signature, username, newPassword)
  if (clash) return { ok: false, error: "New password can't be the same as your signature." }

  await users.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(newPassword) } })
  await destroyAllSessions(user._id)
  redirect("/login?reset=1")
}

/* ---------------- Settings → Security (all require the current password) ---------------- */

async function verifyCurrentPassword(userId: ObjectId, password: string) {
  const limitKey = `reauth:${userId.toHexString()}`
  if (await isRateLimited(limitKey)) throw new ActionError(RATE_LIMIT_MESSAGE)
  const { users } = await collections()
  const user = await users.findOne({ _id: userId })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordFailure(limitKey)
    throw new ActionError("Current password is wrong.", "currentPassword")
  }
  return user
}

export type RevealState = ActionState & { signature?: string }

export async function revealSignatureAction(_: RevealState, form: FormData): Promise<RevealState> {
  let signature: string | undefined
  const result = await runAction(
    async () => {
      const me = await requireUserForMutation()
      const user = await verifyCurrentPassword(me._id, String(form.get("currentPassword") ?? ""))
      signature = decryptSignature(user.signatureEnc)
    },
    { refresh: false },
  )
  return { ...result, signature }
}

export async function changeSignatureAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireUserForMutation()
    const currentPassword = String(form.get("currentPassword") ?? "")
    const parsed = signatureSchema.safeParse(form.get("signature") ?? "")
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message, "signature")
    await verifyCurrentPassword(me._id, currentPassword)
    const clash = signatureClash(parsed.data, me.username, currentPassword)
    if (clash) throw new ActionError(clash, "signature")
    const { users } = await collections()
    await users.updateOne({ _id: me._id }, { $set: { signatureEnc: encryptSignature(parsed.data) } })
  })
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireUserForMutation()
    const parsed = passwordSchema.safeParse(form.get("newPassword") ?? "")
    if (!parsed.success) throw new ActionError(parsed.error.issues[0].message, "newPassword")
    const user = await verifyCurrentPassword(me._id, String(form.get("currentPassword") ?? ""))
    if (safeEqual(decryptSignature(user.signatureEnc), parsed.data)) {
      throw new ActionError("New password can't be the same as your signature.", "newPassword")
    }
    const { users } = await collections()
    await users.updateOne({ _id: me._id }, { $set: { passwordHash: await hashPassword(parsed.data) } })
  })
}
