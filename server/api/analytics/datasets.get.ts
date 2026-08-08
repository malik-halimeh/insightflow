import type { DatasetSummary } from '#shared/types/analytics'
import { datasetsCollection } from '../../utils/db'
import { requireOwnerId } from '../../utils/ownership'

/**
 * The short list behind the dashboard's data set switcher. Read only — M2 owns the
 * full create and upload surface at /api/datasets.
 *
 * Written by M3. Adapted here to use the shared collection helpers, to require a
 * session, and then to filter by the signed-in account: this returns a business's
 * own trading periods, and a session alone was enough to read every business's.
 */
export default defineEventHandler(async (event): Promise<DatasetSummary[]> => {
  const ownerId = requireOwnerId(event)

  const documents = await (await datasetsCollection())
    .find({ ownerId })
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
