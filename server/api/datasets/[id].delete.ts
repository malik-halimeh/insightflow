import { ObjectId } from 'mongodb'
import { requireSession } from '../../utils/auth'
import { datasetsCollection, salesRowsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<{ deleted: true }> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  const col = await datasetsCollection()
  const result = await col.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  // Delete all sales rows belonging to this dataset
  await (await salesRowsCollection()).deleteMany({ datasetId: id })

  return { deleted: true }
})
