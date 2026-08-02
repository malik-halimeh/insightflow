import type { DatasetSummary } from '#shared/types/analytics'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'

/**
 * The short list behind the dashboard's data set switcher. Read only — M2 owns the
 * full create and upload surface at /api/datasets.
 *
 * Written by M3. Adapted here to use the shared collection helpers and, more
 * importantly, to require a session: this returns a business's own trading periods
 * and was previously readable by anyone who knew the URL.
 */
export default defineEventHandler(async (event): Promise<DatasetSummary[]> => {
  requireSession(event)

  const documents = await (await datasetsCollection())
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, name, businessType, periodStart, periodEnd, rowCount, createdAt }) => ({
    id: _id.toHexString(),
    name,
    businessType,
    periodStart,
    periodEnd,
    rowCount,
    createdAt
  }))
})
