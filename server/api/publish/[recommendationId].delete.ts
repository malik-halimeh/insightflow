import { idSchema } from '#shared/schemas'

export default defineEventHandler(async (event): Promise<{ deleted: true }> => {
  requireSession(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'recommendationId'))
  if (!parsedId.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedId.error.issues[0]?.message
        ?? 'This published insight could not be identified.'
    })
  }

  const result = await (await publishedInsightsCollection()).deleteOne({
    recommendationId: parsedId.data
  })

  if (result.deletedCount === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This insight is not published.'
    })
  }

  return { deleted: true }
})
