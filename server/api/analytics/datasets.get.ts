// Owner: M3
// GET /api/analytics/datasets
// Lightweight list used to populate the dashboard's dataset switcher.
// Read-only — M2 owns the full dataset CRUD/upload surface at /api/datasets.

import { ObjectId } from 'mongodb'
import type { DatasetSummary } from '~~/shared/types/analytics'
// Explicit import instead of relying on Nitro's server/utils auto-import —
// on some setups (notably Windows dev folders under OneDrive/Downloads,
// where the file watcher misses events) auto-import silently fails to
// register utils, producing "getCollection is not defined" at request time.
// An explicit import always works regardless of the scanner.
import { getCollection } from '~~/server/utils/db'

export default defineEventHandler(async (): Promise<DatasetSummary[]> => {
  const col = await getCollection('datasets')

  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .project({ name: 1, businessType: 1, periodStart: 1, periodEnd: 1, rowCount: 1, createdAt: 1 })
    .toArray()

  return docs.map((d) => ({
    _id: (d._id as ObjectId).toString(),
    name: String(d.name ?? 'Untitled dataset'),
    businessType: String(d.businessType ?? 'business'),
    periodStart: String(d.periodStart ?? ''),
    periodEnd: String(d.periodEnd ?? ''),
    rowCount: Number(d.rowCount ?? 0),
    createdAt: String(d.createdAt ?? ''),
  }))
})
