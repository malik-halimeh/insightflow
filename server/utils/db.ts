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
import { MongoClient, type Db, type Document, type Collection } from 'mongodb'

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
  return client.db(dbName)
}

export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
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
