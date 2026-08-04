import { MongoServerError, ObjectId } from 'mongodb'
import {
  publishedInsightCreateSchema,
  publishedInsightSchema,
  type Dimension,
  type Metric,
  type PublishedInsight
} from '#shared/schemas'

const METRIC_LABELS: Record<Metric, string> = {
  revenue: 'Revenue',
  quantity: 'Units sold',
  orders: 'Orders'
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  dayOfWeek: 'day of week',
  item: 'item',
  category: 'category',
  hour: 'hour'
}

function buildSlug(displayName: string, title: string): string {
  return `${displayName} ${title}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'insight'
}

function isDuplicateSlugError(error: unknown): boolean {
  return error instanceof MongoServerError
    && error.code === 11000
    && error.message.includes('publishedInsights_slug_unique')
}

export default defineEventHandler(async (event): Promise<PublishedInsight> => {
  requireSession(event)

  const parsed = publishedInsightCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message
        ?? 'Please check the publish form and try again.'
    })
  }

  const insights = await publishedInsightsCollection()
  const existing = await insights.findOne({
    recommendationId: parsed.data.recommendationId
  })

  // Publishing is idempotent. If the browser retries after losing the response,
  // return the public record instead of creating a duplicate page.
  if (existing) {
    const { _id, ...insight } = existing
    return publishedInsightSchema.parse({
      id: _id.toHexString(),
      ...insight
    })
  }

  const recommendation = await (await recommendationsCollection()).findOne({
    _id: new ObjectId(parsed.data.recommendationId)
  })

  if (!recommendation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This recommendation could not be found. Refresh the page and try again.'
    })
  }

  const dataset = await (await datasetsCollection()).findOne({
    _id: new ObjectId(recommendation.datasetId)
  })

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'The data set behind this recommendation could not be found.'
    })
  }

  const id = new ObjectId()
  const baseSlug = buildSlug(parsed.data.displayName, recommendation.title)
  let attempt = 1

  while (true) {
    const insight = publishedInsightSchema.parse({
      id: id.toHexString(),
      slug: attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`,
      displayName: parsed.data.displayName,
      caption: parsed.data.caption,
      metricLabel: `${METRIC_LABELS[recommendation.metric]} by ${DIMENSION_LABELS[recommendation.dimension]}`,
      metricValue: recommendation.changePercent,
      hideAbsoluteNumbers: parsed.data.hideAbsoluteNumbers,
      businessType: dataset.businessType,
      recommendationId: parsed.data.recommendationId,
      datasetId: recommendation.datasetId,
      publishedAt: new Date().toISOString()
    })

    const { id: insightId, ...document } = insight

    try {
      await insights.insertOne({
        _id: new ObjectId(insightId),
        ...document
      })

      setResponseStatus(event, 201)
      return insight
    } catch (error) {
      if (!isDuplicateSlugError(error)) {
        throw error
      }

      attempt += 1
    }
  }
})
