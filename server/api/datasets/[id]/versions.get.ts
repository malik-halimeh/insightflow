import type { DatasetVersion } from '#shared/schemas'
import { datasetVersionsCollection } from '../../../utils/db'
import { requireOwnedDataset } from '../../../utils/ownership'

/**
 * Every upload of one data set, newest first, for the history page.
 *
 * OWNER: M1. This sits inside M2's `server/api/datasets/` folder because that is
 * where the URL puts it; the versioning backend is M1's, the page that reads it is
 * M2's. Nothing else under `datasets/` belongs to M1.
 *
 * Uncapped on purpose. There are never more than ten — `pruneVersions` in
 * server/utils/versioning.ts sees to that — so paging a list that short would cost
 * the owner a second request to save nothing.
 */
export default defineEventHandler(async (event): Promise<DatasetVersion[]> => {
  // Checked rather than assumed, so an unknown data set reads as "not found"
  // instead of an empty history, which would look like a data set that simply had
  // no uploads yet. The same call proves the data set is the caller's, so an id
  // belonging to another business cannot list its upload history either.
  const dataset = await requireOwnedDataset(event, getRouterParam(event, 'id'))
  const id = dataset._id.toHexString()

  const documents = await (await datasetVersionsCollection())
    .find({ datasetId: id })
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, ...version }) => ({ id: _id.toHexString(), ...version }))
})
