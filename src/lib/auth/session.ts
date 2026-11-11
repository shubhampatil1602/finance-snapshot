import "server-only"
import { cookies } from "next/headers"
import type { ObjectId } from "mongodb"
import { collections } from "../db"
import { hashToken, newSessionToken } from "../crypto"
import { env } from "../env"

export const SESSION_COOKIE = "fs_session"
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function createSession(userId: ObjectId) {
  const token = newSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const { sessions } = await collections()
  await sessions.insertOne({ _id: hashToken(token), userId, expiresAt })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

/** Returns the session's userId, or null when missing/expired. */
export async function readSessionUserId(): Promise<ObjectId | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const { sessions } = await collections()
  const session = await sessions.findOne({ _id: hashToken(token) })
  if (!session || session.expiresAt.getTime() <= Date.now()) return null
  return session.userId
}

export async function destroyCurrentSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    const { sessions } = await collections()
    await sessions.deleteOne({ _id: hashToken(token) })
  }
  store.delete(SESSION_COOKIE)
}

export async function destroyAllSessions(userId: ObjectId) {
  const { sessions } = await collections()
  await sessions.deleteMany({ userId })
}
