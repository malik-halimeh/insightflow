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
  publishedInsights: 'publishedInsights',

  /**
   * Whether the advice worked. One record per followed recommendation, holding a
   * frozen snapshot of the finding and the two measurement windows either side of
   * the date the owner acted.
   */
  outcomes: 'outcomes',

  /**
   * Upload history. `datasetVersions` holds one record per upload;
   * `datasetVersionRows` holds those uploads' rows.
   *
   * The rows are archived here rather than in `salesRows` because every read in
   * the product filters `salesRows` by `datasetId` alone — the analytics summary,
   * the rows table and the rule engine all do. Keeping more than one version in
   * there would add one upload's revenue to another's on three screens at once,
   * without raising an error. `salesRows` therefore keeps its original meaning:
   * the rows of whichever version is current.
   */
  datasetVersions: 'datasetVersions',
  datasetVersionRows: 'datasetVersionRows'
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

    /*
      Per-owner scoping. `ownerId` is now the first thing almost every query
      filters on, so it leads both of these compound indexes: the data set list
      reads one owner's newest first, and the recommendations page reads one
      owner's single newest.

      Not unique. An owner has many data sets and many rules, which is the point.
    */
    db.collection(COLLECTIONS.datasets).createIndex(
      { ownerId: 1, createdAt: -1 },
      { name: 'datasets_ownerId_createdAt' }
    ),

    db.collection(COLLECTIONS.rules).createIndex(
      { ownerId: 1, name: 1 },
      { name: 'rules_ownerId_name' }
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
    ),

    // The history page lists one data set's uploads newest first, and the
    // ten-version cap reads the same order from the other end to find what to drop.
    db.collection(COLLECTIONS.datasetVersions).createIndex(
      { datasetId: 1, createdAt: -1 },
      { name: 'datasetVersions_datasetId_createdAt' }
    ),

    // Restore reads one archived version back in date order, the same order the
    // rows were stored in and the same order every analytics query wants them.
    db.collection(COLLECTIONS.datasetVersionRows).createIndex(
      { versionId: 1, date: 1 },
      { name: 'datasetVersionRows_versionId_date' }
    ),

    // Deleting a data set has to take its archived rows with it. Mongo enforces no
    // referential integrity, so the delete handler does — and it deletes by data
    // set, not by walking each version.
    db.collection(COLLECTIONS.datasetVersionRows).createIndex(
      { datasetId: 1 },
      { name: 'datasetVersionRows_datasetId' }
    ),

    /*
      One outcome per recommendation, enforced here rather than in the route.

      A recommendation is followed once. Two outcomes against the same finding
      would both be counted by the scoreboard, so an owner who double-clicks
      "Record outcome", or whose browser retries a request it never saw the
      response to, would move their own improvement rate. A unique index makes
      that a duplicate-key error the route can turn into the existing record,
      which a findOne-then-insert cannot: there is always a window between the
      two where a second request fits.
    */
    db.collection(COLLECTIONS.outcomes).createIndex(
      { recommendationId: 1 },
      { unique: true, name: 'outcomes_recommendationId_unique' }
    ),

    /*
      The outcomes list and its scoreboard read one data set, newest first, and
      the readiness sweep reads the pending ones. Status leads the second index
      because 'pending' is the only value that sweep looks for, and it stays a
      small slice of the collection as completed outcomes accumulate.
    */
    db.collection(COLLECTIONS.outcomes).createIndex(
      { datasetId: 1, createdAt: -1 },
      { name: 'outcomes_datasetId_createdAt' }
    ),

    db.collection(COLLECTIONS.outcomes).createIndex(
      { status: 1, datasetId: 1 },
      { name: 'outcomes_status_datasetId' }
    )
  ])
}
