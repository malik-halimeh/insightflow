import type { SalesRow } from '#shared/schemas'
import { requireOwnedDataset } from '../../../utils/ownership'
import { salesRowsCollection } from '../../../utils/db'

/**
 * A sample of the rows in a data set, newest first, for the preview on the detail
 * page. Capped deliberately: a data set holds hundreds of rows and nobody scrolls
 * a page that long, so sending them all costs the owner a slow page for nothing.
 */
const PREVIEW_LIMIT = 20

export default defineEventHandler(async (event): Promise<SalesRow[]> => {
  // Sales rows carry no owner of their own; they inherit it from the data set they
  // belong to. Proving the data set is the caller's is therefore what makes the
  // filter below safe, and skipping it would let any id read any business's rows.
  const dataset = await requireOwnedDataset(event, getRouterParam(event, 'id'))
  const id = dataset._id.toHexString()

  const documents = await (await salesRowsCollection())
    .find({ datasetId: id })
    .sort({ date: -1 })
    .limit(PREVIEW_LIMIT)
    .toArray()

  return documents.map(({ _id, ...row }) => ({ id: _id.toHexString(), ...row }))
})
