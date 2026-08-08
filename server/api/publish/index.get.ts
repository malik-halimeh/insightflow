import {
  publishedInsightSchema,
  type PublishedInsight
} from '#shared/schemas'

export default defineEventHandler(async (event): Promise<PublishedInsight[]> => {
  // The owner's own published insights, not everyone's. This drives the publish
  // and unpublish state on the recommendations page, so an unfiltered list showed
  // one business another's findings as already published.
  //
  // Scoped through the data sets rather than by a field of its own: a published
  // insight belongs to the data set the finding came from, exactly as a
  // recommendation does. An owner with no data sets matches nothing, which is the
  // correct answer for a new account.
  const datasetIds = await ownedDatasetIds(event)

  const documents = await (await publishedInsightsCollection())
    .find({ recommendationId: { $ne: null }, datasetId: { $in: datasetIds } })
    .sort({ publishedAt: -1 })
    .toArray()

  return documents.map(({ _id, ...insight }) =>
    publishedInsightSchema.parse({
      id: _id.toHexString(),
      ...insight
    })
  )
})
