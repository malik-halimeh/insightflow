import { ObjectId } from 'mongodb'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'


export default defineEventHandler(async (event) => {

  requireSession(event)


  const id = event.context.params?.id



  if (!id || !ObjectId.isValid(id)) {

    throw createError({
      statusCode:400,
      statusMessage:'Invalid data set id.'
    })

  }



  const result =
    await (await datasetsCollection())
    .deleteOne({

      _id:new ObjectId(id)

    })



  if(result.deletedCount === 0){

    throw createError({

      statusCode:404,

      statusMessage:'Data set not found.'

    })

  }



  return {
    success:true
  }


})