import { ObjectId } from 'mongodb'
import type { SalesRow } from '#shared/schemas'
import { requireSession } from '../../../utils/auth'
import { salesRowsCollection } from '../../../utils/db'

/**
 * A sample of the rows in a data set, newest first, for the preview on the detail
 * page. Capped deliberately: a data set holds hundreds of rows and nobody scrolls
 * a page that long, so sending them all costs the owner a slow page for nothing.
 */
const PREVIEW_LIMIT = 20

export default defineEventHandler(async (event): Promise<SalesRow[]> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  const documents = await (await salesRowsCollection())
    .find({ datasetId: id })
    .sort({ date: -1 })
    .limit(PREVIEW_LIMIT)
    .toArray()

  return documents.map(({ _id, ...row }) => ({ id: _id.toHexString(), ...row }))
})
