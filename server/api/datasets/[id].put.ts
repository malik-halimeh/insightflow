import { ObjectId } from 'mongodb'
import { datasetCreateSchema, type Dataset } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That data set could not be found.'
    })
  }

  // datasetCreateSchema, not datasetSchema. The record schema also demands the id,
  // the row count and the timestamps, none of which the edit form sends and none
  // of which a browser is allowed to set — so validating against it rejects every
  // real edit, and the owner sees a form that does nothing when they press save.
  const parsed = datasetCreateSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    })
  }

  const result = await (await datasetsCollection()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      // Only the fields the owner typed. Spreading a whole record here would let a
      // request overwrite the row count or the created date.
      $set: {
        ...parsed.data,
        updatedAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  )

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'That data set could not be found.'
    })
  }

  const { _id, ...rest } = result

  return {
    id: _id.toHexString(),
    ...rest
  }
})
