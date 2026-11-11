import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import type { ObjectId } from "mongodb"
import { collections } from "../db"
import { todayIn } from "../dates"
import type { CurrentUser } from "../types"
import { readSessionUserId } from "./session"

export type AuthedUser = CurrentUser & { _id: ObjectId; today: string }

/**
 * The Data Access Layer entry point. Reads the session once per request and
 * returns a narrow user — never the password hash or signature.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  // Session expiry and "Today" depend on the clock, so this must run at request
  // time, never inside a (runtime) prerender.
  await connection()
  const userId = await readSessionUserId()
  if (!userId) return null
  const { users } = await collections()
  const user = await users.findOne(
    { _id: userId },
    { projection: { username: 1, timezone: 1, currency: 1 } },
  )
  if (!user) return null
  return {
    _id: user._id,
    id: user._id.toHexString(),
    username: user.username,
    timezone: user.timezone,
    currency: user.currency,
    today: todayIn(user.timezone),
  }
})

/** For pages: redirect to /login when signed out. */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You are signed out. Please log in again.")
  }
}

/** For Server Actions and Route Handlers: throws instead of redirecting. */
export async function requireUserForMutation(): Promise<AuthedUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
