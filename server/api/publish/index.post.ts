import { MongoServerError, ObjectId } from 'mongodb'
import {
  publishedInsightCreateSchema,
  publishedInsightSchema,
  type PublishedInsight
} from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { publishedInsightsCollection } from '../../utils/db'
import { randomSuffix, slugify } from '../../utils/slug'

const DUPLICATE_KEY = 11000
const MAX_ATTEMPTS = 5

/**
 * Turns one finding into a row in `publishedInsights`. The slug is derived from
 * the shown name and the metric, and a collision (two owners publishing something
 * with the same words) is resolved by retrying with a short random suffix rather
 * than failing the request — see docs/DATA-MODEL.md for why uniqueness lives here
 * and not in Zod.
 */
export default defineEventHandler(async (event): Promise<PublishedInsight> => {
  requireSession(event)

  const parsed = publishedInsightCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the details and try again.'
    })
  }

  const insights = await publishedInsightsCollection()
  const baseSlug = slugify(`${parsed.data.displayName}-${parsed.data.metricLabel}`)
  const publishedAt = new Date().toISOString()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`
    const _id = new ObjectId()

    try {
      await insights.insertOne({ _id, slug, publishedAt, ...parsed.data })
      return publishedInsightSchema.parse({ id: _id.toHexString(), slug, publishedAt, ...parsed.data })
    } catch (error) {
      const isDuplicateSlug = error instanceof MongoServerError && error.code === DUPLICATE_KEY
      if (!isDuplicateSlug) throw error
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'We could not publish this right now. Please try again.'
  })
})
