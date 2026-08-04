import { ObjectId } from 'mongodb'
import { datasetSchema, type Dataset, SESSION_COOKIE } from '#shared/schemas'
import { datasetsCollection } from '../../utils/db'
import { verifySessionToken } from '../../utils/session'

export default defineEventHandler(async (event): Promise<Dataset> => {

  const config = useRuntimeConfig(event)
  const token = getCookie(event, SESSION_COOKIE)
  const payload = token && config.sessionSecret 
    ? verifySessionToken(token, config.sessionSecret) 
    : null

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const id = event.context.params?.id

  if (!id || !ObjectId.isValid(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid data set id.'
    })
  }

  const parsed = datasetSchema.safeParse(
    await readBody(event)
  )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the form.'
    })
  }

  const updatedAt = new Date().toISOString()

  const result = await (await datasetsCollection()).findOneAndUpdate(
    {
      _id: new ObjectId(id)
    },
    {
      $set: {
        ...parsed.data,
        updatedAt
      }
    },
    {
      returnDocument: 'after'
    }
  )

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data set not found.'
    })
  }

  const { _id, ...rest } = result

  return {
    id: _id.toHexString(),
    ...rest
  }
})