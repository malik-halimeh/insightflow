import { ObjectId } from 'mongodb'
import { type Dataset } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'


export default defineEventHandler(async (event): Promise<Dataset> => {

  requireSession(event)


  const id = event.context.params?.id


  if (!id || !ObjectId.isValid(id)) {

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid data set id.'
    })

  }


  const document = await (await datasetsCollection())
    .findOne({
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