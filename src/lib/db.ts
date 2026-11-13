import "server-only"
import { attachDatabasePool } from "@vercel/functions"
import { MongoClient, ObjectId, type Db } from "mongodb"
import { env } from "./env"
import type {
  CategoryDoc,
  ContributionDoc,
  GoalDoc,
  PaymentMethodDoc,
  RateLimitDoc,
  RecurringDoc,
  SessionDoc,
  TransactionDoc,
  UserDoc,
} from "./types"

type Cache = { client?: Promise<MongoClient>; indexes?: Promise<void> }
// Survive hot reloads in development without opening a new pool each time.
const globalCache = globalThis as unknown as { __financeMongo?: Cache }
const cache: Cache = (globalCache.__financeMongo ??= {})

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ username: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ userId: 1 }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("paymentMethods").createIndex({ userId: 1 }),
    db.collection("categories").createIndex({ userId: 1 }),
    db.collection("recurring").createIndex({ userId: 1 }),
    db.collection("goals").createIndex({ userId: 1 }),
    db.collection("transactions").createIndex({ userId: 1, date: 1 }),
    db.collection("transactions").createIndex(
      { userId: 1, recurringId: 1, forMonth: 1 },
      { unique: true, partialFilterExpression: { recurringId: { $exists: true } } },
    ),
    db.collection("contributions").createIndex({ userId: 1, date: 1 }),
    db.collection("contributions").createIndex({ userId: 1, goalId: 1 }),
    db.collection("rateLimits").createIndex({ key: 1, at: 1 }),
    db.collection("rateLimits").createIndex({ at: 1 }, { expireAfterSeconds: 120 }),
  ])
}

function createClient() {
  const client = new MongoClient(env.mongoUri, {
    // Without these, a query on a silently dropped socket never settles and the
    // page's Suspense fallback stays up forever. Fail fast so error.tsx shows instead.
    // (timeoutMS is ignored in driver 7.x, so bound each stage instead.)
    socketTimeoutMS: 15_000, // no reply on a socket → close it and throw
    waitQueueTimeoutMS: 10_000, // waiting for a free pooled connection
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 5_000,
    // Close idle sockets quickly. With attachDatabasePool below, Vercel keeps the
    // instance awake until they are closed, so none are left to die while it sleeps.
    maxIdleTimeMS: 5_000,
  })
  // Vercel suspends function instances between requests. A pooled socket that was
  // open at suspension is dead when the instance wakes hours later, and the first
  // query on it hangs (the skeleton never resolves). This releases idle connections
  // before the instance is suspended. It is a no-op outside Vercel.
  attachDatabasePool(client)
  return client
}

export async function getDb(): Promise<Db> {
  cache.client ??= createClient()
    .connect()
    .catch((err) => {
      cache.client = undefined
      throw err
    })
  const client = await cache.client
  const db = client.db(env.mongoDb)
  // Index creation is idempotent and only matters for new deployments. Don't make
  // the first request after a cold start wait on ~15 extra round trips for it.
  cache.indexes ??= ensureIndexes(db).catch((err) => {
    cache.indexes = undefined
    console.error("ensureIndexes failed", err)
  })
  return db
}

export async function collections() {
  const db = await getDb()
  return {
    users: db.collection<UserDoc>("users"),
    sessions: db.collection<SessionDoc>("sessions"),
    paymentMethods: db.collection<PaymentMethodDoc>("paymentMethods"),
    categories: db.collection<CategoryDoc>("categories"),
    recurring: db.collection<RecurringDoc>("recurring"),
    transactions: db.collection<TransactionDoc>("transactions"),
    goals: db.collection<GoalDoc>("goals"),
    contributions: db.collection<ContributionDoc>("contributions"),
    rateLimits: db.collection<RateLimitDoc>("rateLimits"),
  }
}

/** Parse an untrusted id. Returns null instead of throwing on garbage. */
export function toObjectId(value: unknown): ObjectId | null {
  if (typeof value !== "string" || !ObjectId.isValid(value) || value.length !== 24) return null
  return new ObjectId(value)
}

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000
}
