import { MongoClient, type Collection, type Db, type Document, type ObjectId } from 'mongodb'
import { COLLECTIONS, ensureIndexes } from './indexes'
// Relative rather than the #shared alias: this file is also loaded by
// scripts/seed.ts, which runs outside Nitro and cannot resolve Nuxt aliases.
import type {
  Dataset,
  PublishedInsight,
  Recommendation,
  Rule,
  SalesRow,
  User
} from '../../shared/schemas'

/**
 * Stored documents keep Mongo's own `_id` and drop the contract's `id`.
 * Everything else matches the shared schemas exactly, so foreign keys such as
 * `datasetId` stay 24-character hex strings and can be validated without conversion.
 */
export type DocOf<T> = Omit<T, 'id'> & { _id: ObjectId }

/**
 * The password hash lives on the document only, never on the `User` contract in
 * `shared/`. Keeping it out of the shared schema means it cannot be returned by
 * accident: a route that serialises a `User` has nothing to leak.
 */
/**
 * The three passwordReset* fields exist only while a forgot-password link is
 * outstanding. `reset-password.post.ts` clears all three the moment the link is
 * used, and the stored value is a SHA-256 of the token that was emailed, never
 * the token itself — so a database read alone cannot produce a working link.
 */
export type UserDoc = DocOf<User> & {
  passwordHash: string
  passwordResetTokenHash?: string
  passwordResetExpiresAt?: string
  passwordResetRequestedAt?: string
}
export type DatasetDoc = DocOf<Dataset>
export type SalesRowDoc = DocOf<SalesRow>
export type RecommendationDoc = DocOf<Recommendation>
export type RuleDoc = DocOf<Rule>
export type PublishedInsightDoc = DocOf<PublishedInsight>

/**
 * Connection state is cached on globalThis so a hot reload in dev, and a warm
 * serverless instance in production, reuse one client instead of opening a socket
 * per request. This is process-level infrastructure, never request-scoped data.
 */
interface MongoCache {
  client?: MongoClient
  connecting?: Promise<MongoClient>
  indexes?: Promise<void>
}

const globalForMongo = globalThis as typeof globalThis & {
  __insightflowMongo?: MongoCache
}

function cache(): MongoCache {
  globalForMongo.__insightflowMongo ??= {}
  return globalForMongo.__insightflowMongo
}

/**
 * Read lazily rather than at module load, so importing this file never throws and
 * the seed script can populate process.env before the first connection is made.
 */
function readConfig(): { uri: string, dbName: string } {
  let uri = process.env.MONGODB_URI
  let dbName = process.env.MONGODB_DB

  // Inside Nitro, runtimeConfig wins: it applies the NUXT_-prefixed overrides that
  // reading process.env alone would miss, so a secret can be rotated on the host
  // without a rebuild. The seed script runs outside Nitro, where this function does
  // not exist, and falls back to the environment.
  try {
    const config = useRuntimeConfig()
    uri = config.mongodbUri || uri
    dbName = config.mongodbDb || dbName
  } catch {
    // Not running inside Nitro.
  }

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.')
  }
  if (!dbName) {
    throw new Error('MONGODB_DB is not set. Copy .env.example to .env and fill it in.')
  }

  return { uri, dbName }
}

export async function getMongoClient(): Promise<MongoClient> {
  const state = cache()
  if (state.client) return state.client

  // Store the in-flight promise so parallel callers during a cold start share
  // one connection attempt rather than racing to open several. A *failed* attempt
  // is discarded rather than cached: otherwise one unreachable moment at startup
  // would leave this instance permanently unable to reach the database, still
  // rejecting instantly long after the database came back.
  if (!state.connecting) {
    state.connecting = new MongoClient(readConfig().uri)
      .connect()
      .catch((error: unknown) => {
        delete state.connecting
        throw error
      })
  }

  state.client = await state.connecting

  return state.client
}

export async function getDb(): Promise<Db> {
  const state = cache()
  const client = await getMongoClient()
  const db = client.db(readConfig().dbName)

  state.indexes ??= ensureIndexes(db)
  await state.indexes

  return db
}

async function collection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}

export const usersCollection = () => collection<UserDoc>(COLLECTIONS.users)
export const datasetsCollection = () => collection<DatasetDoc>(COLLECTIONS.datasets)
export const salesRowsCollection = () => collection<SalesRowDoc>(COLLECTIONS.salesRows)
export const recommendationsCollection = () => collection<RecommendationDoc>(COLLECTIONS.recommendations)
export const rulesCollection = () => collection<RuleDoc>(COLLECTIONS.rules)
export const publishedInsightsCollection = () => collection<PublishedInsightDoc>(COLLECTIONS.publishedInsights)

export async function closeMongoClient(): Promise<void> {
  const state = cache()
  if (state.client) await state.client.close()
  delete state.client
  delete state.connecting
  delete state.indexes
}
