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
    ),

    // Sign in looks a user up by either field, and two accounts must never be able
    // to share one. Usernames and emails are stored lower-cased, so this is a plain
    // equality index rather than a case-insensitive collation.
    db.collection(COLLECTIONS.users).createIndex(
      { username: 1 },
      { unique: true, name: 'users_username_unique' }
    ),
    db.collection(COLLECTIONS.users).createIndex(
      { email: 1 },
      { unique: true, name: 'users_email_unique' }
    ),

    // The admin dashboard lists business-owner accounts filtered by status
    // (pending approvals first), so this is read on every load of /admin.
    db.collection(COLLECTIONS.users).createIndex(
      { role: 1, status: 1, createdAt: -1 },
      { name: 'users_role_status_createdAt' }
    )
  ])
}
