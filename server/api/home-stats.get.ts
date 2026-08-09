/**
 * Public endpoint — no auth required.
 * Returns live stats for the homepage (insight count, approved business count)
 * and the most recent published insight, so the landing page's teaser card
 * shows a real finding from MongoDB instead of a hard-coded example.
 * Cached with SWR (see routeRules in nuxt.config.ts) so the homepage stays
 * fast while still reflecting real data.
 */
import type { HomeInsight, HomeOutcomeStory, HomeStats } from '#shared/types/home'
import {
  outcomesCollection,
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
  const [insights, outcomes, users] = await Promise.all([
    publishedInsightsCollection(),
    outcomesCollection(),
    usersCollection()
  ])

  const [insightCount, businessCount, recentDocs, publishedRecommendationIds] = await Promise.all([
    insights.countDocuments({}),
    users.countDocuments({ role: 'business_owner', status: 'approved' }),
    insights.find({}).sort({ publishedAt: -1 }).limit(3).toArray(),
    insights.distinct('recommendationId', { recommendationId: { $ne: null } })
  ])

  const recommendationIds = publishedRecommendationIds.filter(
    (recommendationId): recommendationId is string => typeof recommendationId === 'string'
  )
  const completedOutcome = recommendationIds.length > 0
    ? await outcomes.find({
        recommendationId: { $in: recommendationIds },
        status: { $in: ['improved', 'no_clear_effect', 'worsened'] },
        completedAt: { $ne: null }
      }).sort({ completedAt: -1 }).limit(1).next()
    : null
  const outcomeInsight = completedOutcome
    ? await insights.findOne({ recommendationId: completedOutcome.recommendationId })
    : null
  const outcomeStory: HomeOutcomeStory | null = completedOutcome
    && completedOutcome.status !== 'pending'
    && outcomeInsight
    ? {
        caption: outcomeInsight.caption,
        metricLabel: outcomeInsight.metricLabel,
        metricValue: outcomeInsight.metricValue,
        outcomeStatus: completedOutcome.status,
        observedChangePercent: completedOutcome.changePercent
      }
    : null
  const recentInsights = recentDocs.map(asHomeInsight)

  return {
    insightCount,
    businessCount,
    latestInsight: recentInsights[0] ?? null,
    recentInsights,
    outcomeStory
  }
})
