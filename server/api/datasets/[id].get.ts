import { ObjectId } from 'mongodb'
import { type Dataset, SESSION_COOKIE } from '#shared/schemas'
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

  const document = await (await datasetsCollection()).findOne({
    _id: new ObjectId(id)
  })

  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data set not found.'
    })
  }

  const { _id, ...rest } = document

  return {
    id: _id.toHexString(),
    ...rest
  }
})