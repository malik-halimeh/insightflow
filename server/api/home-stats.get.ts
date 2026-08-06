/**
 * Public endpoint — no auth required.
 * Returns live stats for the homepage (insight count, approved business count)
 * and the most recent published insight, so the landing page's teaser card
 * shows a real finding from MongoDB instead of a hard-coded example.
 * Cached with SWR (see routeRules in nuxt.config.ts) so the homepage stays
 * fast while still reflecting real data.
 */
import { publishedInsightSchema } from '#shared/schemas'
import type { HomeStats } from '#shared/types/home'
import { publishedInsightsCollection, usersCollection } from '../utils/db'

export default defineEventHandler(async (): Promise<HomeStats> => {
  const [insights, users] = await Promise.all([
    publishedInsightsCollection(),
    usersCollection()
  ])

  const [insightCount, businessCount, latestDocs] = await Promise.all([
    insights.countDocuments({}),
    users.countDocuments({ role: 'business_owner', status: 'approved' }),
    insights.find({}).sort({ publishedAt: -1 }).limit(1).toArray()
  ])

  const latestInsight = latestDocs[0]
    ? publishedInsightSchema.parse({
        id: latestDocs[0]._id.toHexString(),
        ...latestDocs[0]
      })
    : null

  return { insightCount, businessCount, latestInsight }
})
