import type { PublishedInsight } from '../schemas'

export type HomeInsight = Pick<PublishedInsight,
  | 'slug'
  | 'displayName'
  | 'caption'
  | 'metricLabel'
  | 'metricValue'
  | 'businessType'
  | 'publishedAt'
>

/**
 * The shape returned by GET /api/home-stats — live counts read from MongoDB
 * for the public landing page. Not a stored record, so it has no Zod schema
 * of its own (same pattern as AdminUserSummary in ./admin.ts).
 */
export interface HomeStats {
  insightCount: number
  businessCount: number
  latestInsight: HomeInsight | null
  recentInsights: HomeInsight[]
}
