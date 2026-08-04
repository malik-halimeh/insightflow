import { publishedInsightSchema, slugSchema, type PublishedInsight } from '#shared/schemas'
import { publishedInsightsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<PublishedInsight> => {
  const parsedSlug = slugSchema.safeParse(getRouterParam(event, 'slug'))
  if (!parsedSlug.success) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This published insight could not be found.'
    })
  }

  const document = await (await publishedInsightsCollection()).findOne({
    slug: parsedSlug.data
  })

  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This published insight could not be found.'
    })
  }

  const { _id, ...publishedInsight } = document
  return publishedInsightSchema.parse({
    id: _id.toHexString(),
    ...publishedInsight
  })
})
