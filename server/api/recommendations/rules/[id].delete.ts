import { ObjectId } from 'mongodb'
import { idSchema } from '#shared/schemas'

export default defineEventHandler(async (event): Promise<{ deleted: true }> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')
  const parsedId = idSchema.safeParse(id)

  if (!parsedId.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedId.error.issues[0]?.message
        ?? 'We could not identify this rule.'
    })
  }

  const collection = await rulesCollection()
  const result = await collection.deleteOne({
    _id: new ObjectId(parsedId.data)
  })

  if (result.deletedCount === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This rule could not be found.'
    })
  }

  return { deleted: true }
})