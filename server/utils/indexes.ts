import type { Db } from 'mongodb'

/**
 * The physical layout of the database: what the collections are called and what
 * they are indexed by. `db.ts` is the only thing that should need to read this.
 */
export const COLLECTIONS = {
  users: 'users',
  datasets: 'datasets',
  salesRows: 'salesRows',
  recommendations: 'recommendations',
  rules: 'rules',
  publishedInsights: 'publishedInsights'
} as const

/**
 * createIndex is idempotent, so this is safe to call repeatedly. `db.ts` still
 * caches the call so it runs once per process rather than once per request.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    // Every analytics query reads one data set in date order.
    db.collection(COLLECTIONS.salesRows).createIndex(
      { datasetId: 1, date: 1 },
      { name: 'salesRows_datasetId_date' }
    ),

    // The public feed looks insights up by slug, and two businesses must never
    // be able to claim the same public URL.
    db.collection(COLLECTIONS.publishedInsights).createIndex(
      { slug: 1 },
      { unique: true, name: 'publishedInsights_slug_unique' }
    ),

    // The feed lists newest first.
    db.collection(COLLECTIONS.publishedInsights).createIndex(
      { publishedAt: -1 },
      { name: 'publishedInsights_publishedAt_desc' }
    )
  ])
}
