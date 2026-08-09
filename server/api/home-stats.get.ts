/**
 * Public endpoint — no auth required.
 * Returns live stats for the homepage (insight count, approved business count)
 * and the most recent published insight, so the landing page's teaser card
 * shows a real finding from MongoDB instead of a hard-coded example.
 * Cached with SWR (see routeRules in nuxt.config.ts) so the homepage stays
 * fast while still reflecting real data.
 */
import type { HomeInsight, HomeStats } from '#shared/types/home'
import {
  publishedInsightsCollection,
  usersCollection,
  type PublishedInsightDoc
} from '../utils/db'

function asHomeInsight(insight: PublishedInsightDoc): HomeInsight {
  return {
    slug: insight.slug,
    displayName: insight.displayName,
    caption: insight.caption,
    metricLabel: insight.metricLabel,
    metricValue: insight.metricValue,
    businessType: insight.businessType,
    publishedAt: insight.publishedAt
  }
}

export default defineEventHandler(async (): Promise<HomeStats> => {
  const [insights, users] = await Promise.all([
    publishedInsightsCollection(),
    usersCollection()
  ])

  const [insightCount, businessCount, recentDocs] = await Promise.all([
    insights.countDocuments({}),
    users.countDocuments({ role: 'business_owner', status: 'approved' }),
    insights.find({}).sort({ publishedAt: -1 }).limit(3).toArray()
  ])

  const recentInsights = recentDocs.map(asHomeInsight)

  return {
    insightCount,
    businessCount,
    latestInsight: recentInsights[0] ?? null,
    recentInsights
  }
})
