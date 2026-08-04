import { ObjectId } from 'mongodb'
import {
  datasetCreateSchema,
  type Dataset
} from '#shared/schemas'

import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'


export default defineEventHandler(async (event): Promise<Dataset> => {

  requireSession(event)


  const id = event.context.params?.id


  if (!id || !ObjectId.isValid(id)) {

    throw createError({
      statusCode:400,
      statusMessage:'Invalid data set id.'
    })

  }



  const parsed = datasetCreateSchema.safeParse(
    await readBody(event)
  )



  if (!parsed.success) {

    throw createError({

      statusCode:400,

      statusMessage:
        parsed.error.issues[0]?.message
        ??
        'Please check the form.'

    })

  }



  const updatedAt =
    new Date().toISOString()



  const result =
    await (await datasetsCollection())
    .findOneAndUpdate(

      {
        _id:new ObjectId(id)
      },

      {
        $set:{
          ...parsed.data,
          updatedAt
        }
      },

      {
        returnDocument:'after'
      }

    )



  if(!result){

    throw createError({
      statusCode:404,
      statusMessage:'Data set not found.'
    })

  }



  const {
    _id,
    ...rest
  } = result



  return {

    id:_id.toHexString(),

    ...rest

  }


})