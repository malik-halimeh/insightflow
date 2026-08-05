import { publishedInsightSchema, type PublishedInsight } from '#shared/schemas'
import { publishedInsightsCollection } from '../../utils/db'

export default defineEventHandler(async (): Promise<PublishedInsight[]> => {
  const documents = await (await publishedInsightsCollection())
    .find({})
    .sort({ publishedAt: -1 })
    .toArray()

  return documents.map(({ _id, ...publishedInsight }) =>
    publishedInsightSchema.parse({
      id: _id.toHexString(),
      ...publishedInsight,
      recommendationId: publishedInsight.recommendationId ?? null,
      datasetId: publishedInsight.datasetId ?? null
    })
  )
})
