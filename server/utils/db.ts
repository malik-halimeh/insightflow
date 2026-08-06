// Owner: M1
// NOTE (M3, Day 2): this was still an empty stub and every /api route — mine
// included — needs a live DB connection to do anything. Implemented the
// standard cached-connection pattern below so we're not all writing our own
// version of this. Please treat this as a draft — happy to adjust names/shape
// to whatever the rest of the team standardizes on.
//
// NOTE (M3, Day 3 — stability pass): the original version cached the
// *connection promise* on globalThis, but never cleared it on failure. If the
// very first connection attempt failed (bad URI, Atlas IP allowlist, no
// network, etc.) that rejected promise stayed cached forever, so every
// request after that failed instantly even after the underlying problem was
// fixed — the only way out was a full server restart. Added: (1) a bounded
// server-selection timeout so a bad connection fails fast instead of hanging
// for 30s, (2) clearing the cached promise on failure so the next request
// retries cleanly, and (3) a small status tracker + ping() so we can report
// "connected to Mongo: yes/no" on server startup and from /api/health.
//
// NOTE (M3, Day 4 — SRV DNS fix): `mongodb+srv://` URIs need the OS resolver
// to answer SRV/TXT lookups for `_mongodb._tcp.<cluster>`. Some networks
// (corporate VPNs, certain containers/sandboxes, some ISP or router DNS)
// don't forward those record types, which surfaces as
// `querySrv ECONNREFUSED _mongodb._tcp....mongodb.net` even though the URI,
// password, and Atlas IP allowlist are all correct. Pointing Node's resolver
// at public DNS providers that do support SRV fixes it without touching the
// connection string or credentials. This runs once, before any connection is
// attempted. If your network blocks outbound DNS/port 27017 entirely (rare,
// but some locked-down sandboxes do), this won't help — see the non-SRV
// fallback URI format documented in .env.example instead.

import dns from 'node:dns'
import { createError } from 'h3'
import { MongoClient, ObjectId, type Db, type Document, type Collection } from 'mongodb'
import type { Dataset, PublishedInsight, Recommendation, Rule, SalesRow, User } from '#shared/schemas'
import { COLLECTIONS, ensureIndexes } from './indexes'

dns.setServers(['8.8.8.8', '1.1.1.1'])
dns.setDefaultResultOrder('ipv4first')

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'insightflow'

export type MongoStatus = 'unconfigured' | 'connecting' | 'connected' | 'error'

interface MongoState {
  status: MongoStatus
  lastError: string | null
  lastConnectedAt: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __insightflowMongoClientPromise: Promise<MongoClient> | undefined
  // eslint-disable-next-line no-var
  var __insightflowMongoState: MongoState | undefined
  // eslint-disable-next-line no-var
  var __insightflowIndexesPromise: Promise<void> | undefined
}

function state(): MongoState {
  if (!globalThis.__insightflowMongoState) {
    globalThis.__insightflowMongoState = {
      status: uri ? 'connecting' : 'unconfigured',
      lastError: null,
      lastConnectedAt: null,
    }
  }
  return globalThis.__insightflowMongoState
}

/**
 * Resolves the shared client without touching a specific database. Used by
 * /api/health, which pings the cluster directly and must never trigger
 * ensureIndexes (see getDb below) — an unhealthy build should not also be
 * the moment indexes get (re)created.
 */
export function getMongoClient(): Promise<MongoClient> {
  return getClientPromise()
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    state().status = 'unconfigured'
    throw createError({
      statusCode: 500,
      statusMessage: 'Database not configured',
      message:
        'MONGODB_URI is missing. Copy .env.example to .env and fill in the connection string.',
    })
  }

  if (!globalThis.__insightflowMongoClientPromise) {
    state().status = 'connecting'
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      // Fail fast (5s) instead of hanging for the ~30s Mongo driver default
      // when the cluster is unreachable (wrong URI, IP not allowlisted, no
      // network path, etc). Callers see a clear error quickly.
      serverSelectionTimeoutMS: 5000,
    })

    globalThis.__insightflowMongoClientPromise = client
      .connect()
      .then((connected) => {
        state().status = 'connected'
        state().lastError = null
        state().lastConnectedAt = new Date().toISOString()
        return connected
      })
      .catch((err) => {
        // Don't leave a rejected promise cached — the next call should get a
        // fresh attempt instead of failing forever until a restart.
        globalThis.__insightflowMongoClientPromise = undefined
        state().status = 'error'
        state().lastError = err instanceof Error ? err.message : String(err)
        throw err
      })
  }

  return globalThis.__insightflowMongoClientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  const db = client.db(dbName)

  // Runs once per process, not once per request. Reuses the ensureIndexes
  // promise itself (not just a boolean) so concurrent first-requests await
  // the same attempt instead of racing createIndex calls, and a failed
  // attempt is retried on the next call rather than being cached forever.
  if (!globalThis.__insightflowIndexesPromise) {
    globalThis.__insightflowIndexesPromise = ensureIndexes(db).catch((err) => {
      globalThis.__insightflowIndexesPromise = undefined
      throw err
    })
  }
  await globalThis.__insightflowIndexesPromise

  return db
}

export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}

// Mongo storage shapes: the same record the shared Zod schema describes, but
// keyed by the driver's own ObjectId instead of the hex-string `id` a client
// receives. Every route maps between the two at the edge (see e.g.
// server/api/datasets/index.get.ts), so `db.ts` is the only file that needs
// to know both shapes exist.
export type DatasetDocument = Omit<Dataset, 'id'> & { _id: ObjectId }
// datasetId is stored on sales rows as a hex string, not an ObjectId — see
// server/api/analytics/[datasetId]/summary.get.ts — so this mirrors SalesRow
// as-is rather than substituting an ObjectId for it.
export type SalesRowDocument = Omit<SalesRow, 'id'> & { _id: ObjectId }
export type RecommendationDocument = Omit<Recommendation, 'id'> & { _id: ObjectId }
export type RuleDocument = Omit<Rule, 'id'> & { _id: ObjectId }
export type PublishedInsightDocument = Omit<PublishedInsight, 'id'> & { _id: ObjectId }
// The password hash never travels through the shared User schema — that schema
// describes what a client is allowed to see, and a hash (even a salted one) is not it.
// The three passwordReset* fields only exist on a document while a forgot-password
// link is outstanding — server/api/auth/reset-password.post.ts clears all three
// the moment the link is used, and the hash is a SHA-256 of the token that was
// actually emailed, never the token itself.
export type UserDocument = Omit<User, 'id'> & {
  _id: ObjectId
  passwordHash: string
  passwordResetTokenHash?: string
  passwordResetExpiresAt?: string
  passwordResetRequestedAt?: string
}

export const datasetsCollection = (): Promise<Collection<DatasetDocument>> =>
  getCollection<DatasetDocument>(COLLECTIONS.datasets)

export const salesRowsCollection = (): Promise<Collection<SalesRowDocument>> =>
  getCollection<SalesRowDocument>(COLLECTIONS.salesRows)

export const recommendationsCollection = (): Promise<Collection<RecommendationDocument>> =>
  getCollection<RecommendationDocument>(COLLECTIONS.recommendations)

export const rulesCollection = (): Promise<Collection<RuleDocument>> =>
  getCollection<RuleDocument>(COLLECTIONS.rules)

export const publishedInsightsCollection = (): Promise<Collection<PublishedInsightDocument>> =>
  getCollection<PublishedInsightDocument>(COLLECTIONS.publishedInsights)

export const usersCollection = (): Promise<Collection<UserDocument>> =>
  getCollection<UserDocument>(COLLECTIONS.users)

/**
 * Closes the shared client and clears the cached promise. Used by scripts (e.g.
 * `npm run seed`), which must exit on their own rather than being kept alive by an
 * open socket the way the long-lived server process is.
 */
export async function closeMongoClient(): Promise<void> {
  const pending = globalThis.__insightflowMongoClientPromise
  if (!pending) return

  globalThis.__insightflowMongoClientPromise = undefined
  const client = await pending.catch(() => null)
  await client?.close()
}

/** Current in-memory connection status, without triggering a new attempt. */
export function getMongoStatus(): MongoState & { configured: boolean } {
  return { ...state(), configured: Boolean(uri) }
}

/**
 * Actively connects (if needed) and pings the cluster. Never throws — always
 * resolves with a result you can log or return from an API route.
 */
export async function pingDatabase(): Promise<{
  connected: boolean
  dbName: string
  status: MongoStatus
  error: string | null
  tookMs: number
}> {
  const start = Date.now()
  if (!uri) {
    return { connected: false, dbName, status: 'unconfigured', error: 'MONGODB_URI is not set', tookMs: 0 }
  }
  try {
    const db = await getDb()
    await db.command({ ping: 1 })
    return { connected: true, dbName, status: 'connected', error: null, tookMs: Date.now() - start }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { connected: false, dbName, status: 'error', error: message, tookMs: Date.now() - start }
  }
}
