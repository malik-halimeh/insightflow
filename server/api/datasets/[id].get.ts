import { ObjectId } from 'mongodb'
import { type Dataset } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset> => {
  // Use the shared helper rather than repeating the cookie check in every route.
  // Written out by hand, a change to how sessions work has to be found in a dozen
  // files, and the message an owner sees drifts from route to route.
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That data set could not be found.'
    })
  }

  const document = await (await datasetsCollection()).findOne({
    _id: new ObjectId(id)
  })

  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'That data set could not be found.'
    })
  }

  const { _id, ...rest } = document

  return {
    id: _id.toHexString(),
    ...rest
  }
})
