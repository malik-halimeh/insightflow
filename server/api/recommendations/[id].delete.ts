import { ObjectId } from 'mongodb'
import { idSchema } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { recommendationsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<{ id: string; deleted: true }> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !idSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recommendation ID.' })
  }

  const recommendations = await recommendationsCollection()
  const result = await recommendations.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'That recommendation could not be found.' })
  }

  return { id, deleted: true }
})
