// Owner: M1 for shared/ — this file added by M3 for the analytics + dashboard
// slice only. Doesn't touch anything else in shared/. Feel free to fold into
// a bigger shared model file later.

export interface DatasetSummary {
  _id: string
  name: string
  businessType: string
  periodStart: string
  periodEnd: string
  rowCount: number
  createdAt: string
}

export type DeltaTone = 'positive' | 'negative' | 'flat'

export interface DeltaValue {
  /** signed percentage, e.g. 34 or -12 */
  value: number
  tone: DeltaTone
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
  delta: DeltaValue
}

export interface TopItemStat {
  itemName: string
  category: string
  unitsSold: number
  revenue: number
  deltaVsNext: DeltaValue | null
}

export interface CategoryStat {
  category: string
  revenue: number
  share: number
}

export interface AnalyticsSummary {
  dataset: DatasetSummary
  kpis: {
    totalRevenue: number
    totalUnits: number
    avgDailyRevenue: number
    distinctItems: number
    revenueDelta: DeltaValue
  }
  revenueTrend: RevenuePoint[]
  dayOfWeek: DayOfWeekStat[]
  topItems: TopItemStat[]
  categories: CategoryStat[]
  busiestDay: DayOfWeekStat | null
  quietestDay: DayOfWeekStat | null
  generatedAt: string
}
