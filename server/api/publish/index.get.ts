import {
  publishedInsightSchema,
  type PublishedInsight
} from '#shared/schemas'

export default defineEventHandler(async (event): Promise<PublishedInsight[]> => {
  requireSession(event)

  const documents = await (await publishedInsightsCollection())
    .find({ recommendationId: { $ne: null } })
    .sort({ publishedAt: -1 })
    .toArray()

  return documents.map(({ _id, ...insight }) =>
    publishedInsightSchema.parse({
      id: _id.toHexString(),
      ...insight
    })
  )
})
