import { ObjectId } from 'mongodb'
import type { DatasetVersion } from '#shared/schemas'
import { requireSession } from '../../../utils/auth'
import { datasetVersionsCollection, datasetsCollection } from '../../../utils/db'

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
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  // Checked rather than assumed, so an unknown data set reads as "not found"
  // instead of an empty history, which would look like a data set that simply had
  // no uploads yet.
  const dataset = await (await datasetsCollection()).findOne({ _id: new ObjectId(id) })

  if (!dataset) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  const documents = await (await datasetVersionsCollection())
    .find({ datasetId: id })
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, ...version }) => ({ id: _id.toHexString(), ...version }))
})
