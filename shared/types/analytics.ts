import type { BusinessType } from '../schemas'

/**
 * The shape of everything the dashboard reads. Written by M3 for the analytics
 * slice and adapted to the shared contract: records expose `id` as a hex string,
 * never `_id`, and a change is a plain signed number so `UiChangeIndicator` stays
 * the single place that decides what up, down and flat look like.
 *
 * These are derived figures, not stored records, which is why they live in
 * shared/types rather than shared/schemas. Nothing here is ever written to the
 * database, so nothing here needs a Zod schema.
 */

export interface DatasetSummary {
  id: string
  name: string
  businessType: BusinessType
  periodStart: string
  periodEnd: string
  rowCount: number
  createdAt: string
}

export interface RevenuePoint {
  date: string
  revenue: number
  units: number
}

export interface DayOfWeekStat {
  day: string
  dayIndex: number
  avgRevenue: number
  totalRevenue: number
  /** Against the overall daily average. Negative means a quieter day. */
  changePercent: number
}

export interface TopItemStat {
  itemName: string
  category: string
  unitsSold: number
  revenue: number
}

export interface CategoryStat {
  category: string
  revenue: number
  /** Percentage of total revenue, 0–100. */
  share: number
}

export interface AnalyticsSummary {
  dataset: DatasetSummary
  kpis: {
    totalRevenue: number
    totalUnits: number
    avgDailyRevenue: number
    distinctItems: number
    /** Second half of the period against the first half. */
    revenueChangePercent: number
  }
  revenueTrend: RevenuePoint[]
  dayOfWeek: DayOfWeekStat[]
  topItems: TopItemStat[]
  categories: CategoryStat[]
  busiestDay: DayOfWeekStat | null
  quietestDay: DayOfWeekStat | null
  /** Days of sales actually present. Below 28 the dashboard hides comparisons. */
  activeDays: number
  generatedAt: string
}
