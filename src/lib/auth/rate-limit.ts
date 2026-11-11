import "server-only"
import { collections } from "../db"

const WINDOW_MS = 60_000
const MAX_FAILURES = 5

/** True when `key` has hit the failure limit within the last minute. */
export async function isRateLimited(key: string): Promise<boolean> {
  const { rateLimits } = await collections()
  const since = new Date(Date.now() - WINDOW_MS)
  const count = await rateLimits.countDocuments({ key, at: { $gt: since } }, { limit: MAX_FAILURES })
  return count >= MAX_FAILURES
}

export async function recordFailure(key: string) {
  const { rateLimits } = await collections()
  await rateLimits.insertOne({ key, at: new Date() })
}

export const RATE_LIMIT_MESSAGE = "Too many attempts. Wait a minute and try again."
