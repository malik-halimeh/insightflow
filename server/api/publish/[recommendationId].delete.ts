import { idSchema } from '#shared/schemas'

function routeCachePrefix(path: string): string {
  return path.replace(/\W/g, '').slice(0, 16) || 'index'
}

async function invalidatePublicInsightCache(slug: string): Promise<void> {
  const storage = useStorage('cache')
  const keys = await storage.getKeys('nitro/routes')
  const prefixes = [
    routeCachePrefix('/insights'),
    routeCachePrefix(`/insights/${slug}`)
  ]

  await Promise.all(keys
    .filter(key => prefixes.some(prefix => key.includes(`_:${prefix}.`)))
    .map(key => storage.removeItem(key)))
}

export default defineEventHandler(async (event): Promise<{ deleted: true }> => {
  // Unpublishing takes a page off the open internet, so it has to be the owner's
  // page to take down. Scoped through the data sets, the same way the list beside
  // it is.
  const datasetIds = await ownedDatasetIds(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'recommendationId'))
  if (!parsedId.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedId.error.issues[0]?.message
        ?? 'This published insight could not be identified.'
    })
  }

  const insights = await publishedInsightsCollection()
  const published = await insights.findOne({
    recommendationId: parsedId.data,
    datasetId: { $in: datasetIds }
  })

  if (!published) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This insight is not published.'
    })
  }

  const result = await insights.deleteOne({
    recommendationId: parsedId.data,
    datasetId: { $in: datasetIds }
  })

  if (result.deletedCount === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This insight is not published.'
    })
  }

  await invalidatePublicInsightCache(published.slug)

  return { deleted: true }
})
