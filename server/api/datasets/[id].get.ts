import { ObjectId } from 'mongodb'
import type { Dataset, SalesRow } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection, salesRowsCollection } from '../../utils/db'

interface DatasetDetail {
  dataset: Dataset
  rows: SalesRow[]
}

export default defineEventHandler(async (event): Promise<DatasetDetail> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  const col = await datasetsCollection()
  const doc = await col.findOne({ _id: new ObjectId(id) })

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  const { _id, ...rest } = doc
  const dataset: Dataset = { id: _id.toHexString(), ...rest }

  // First 20 rows newest-first for the preview table
  const rowDocs = await (await salesRowsCollection())
    .find({ datasetId: id })
    .sort({ date: -1 })
    .limit(20)
    .toArray()

  const rows: SalesRow[] = rowDocs.map(({ _id: rowId, ...rowRest }) => ({
    id: rowId.toHexString(),
    ...rowRest
  }))

  return { dataset, rows }
})
