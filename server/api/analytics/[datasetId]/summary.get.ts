import type {
  AnalyticsSummary,
  CategoryStat,
  DatasetSummary,
  DayOfWeekStat,
  RevenuePoint,
  TopItemStat
} from '#shared/types/analytics'
import { salesRowsCollection } from '../../../utils/db'
import { requireOwnedDataset } from '../../../utils/ownership'

/**
 * Turns the raw sales rows of one data set into the figures the dashboard needs:
 * a daily revenue trend, weekday performance against the overall daily average,
 * the best selling items, and the category mix.
 *
 * The aggregation is M3's. Adapted here to use the shared collection helpers, to
 * require a session, and to return changes as plain signed numbers so that
 * UiChangeIndicator remains the only thing deciding what up and down look like.
 */

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function round(value: number, places = 0): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function percentChange(current: number, baseline: number): number {
  if (!baseline) return 0
  return round(((current - baseline) / baseline) * 100, 1)
}

/** Monday is 0. Parsed as UTC so a machine's time zone cannot shift a day. */
function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

export default defineEventHandler(async (event): Promise<AnalyticsSummary> => {
  // The dashboard's whole figure set for one data set, so the ownership check is
  // what stops an id in the URL from returning another business's takings.
  const dataset = await requireOwnedDataset(event, getRouterParam(event, 'datasetId'))
  const datasetId = dataset._id.toHexString()

  const { _id, name, businessType, periodStart, periodEnd, rowCount, createdAt } = dataset
  const datasetSummary: DatasetSummary = {
    id: _id.toHexString(),
    name,
    businessType,
    periodStart,
    periodEnd,
    rowCount,
    createdAt
  }

  // datasetId is stored on sales rows as a hex string, not an ObjectId.
  const rows = await (await salesRowsCollection()).find({ datasetId }).toArray()

  if (rows.length === 0) {
    return {
      dataset: datasetSummary,
      kpis: {
        totalRevenue: 0,
        totalUnits: 0,
        avgDailyRevenue: 0,
        distinctItems: 0,
        revenueChangePercent: 0
      },
      revenueTrend: [],
      dayOfWeek: [],
      topItems: [],
      categories: [],
      busiestDay: null,
      quietestDay: null,
      activeDays: 0,
      generatedAt: new Date().toISOString()
    }
  }

  // Daily trend
  const byDate = new Map<string, { revenue: number, units: number }>()
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { revenue: 0, units: 0 }
    entry.revenue += row.revenue
    entry.units += row.quantity
    byDate.set(row.date, entry)
  }

  const revenueTrend: RevenuePoint[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date, revenue: round(totals.revenue, 2), units: totals.units }))

  const totalRevenue = round(revenueTrend.reduce((sum, point) => sum + point.revenue, 0), 2)
  const totalUnits = revenueTrend.reduce((sum, point) => sum + point.units, 0)
  const activeDays = revenueTrend.length
  const avgDailyRevenue = round(totalRevenue / activeDays, 2)

  // Second half of the period against the first, per day, so an uneven split
  // does not read as growth.
  const middle = Math.floor(revenueTrend.length / 2)
  const averageOf = (points: RevenuePoint[]) =>
    points.length ? points.reduce((sum, point) => sum + point.revenue, 0) / points.length : 0
  const revenueChangePercent = percentChange(
    averageOf(revenueTrend.slice(middle)),
    averageOf(revenueTrend.slice(0, middle))
  )

  // Weekday performance against the overall daily average
  const byWeekday = new Map<number, { revenue: number, days: number }>()
  for (const point of revenueTrend) {
    const index = weekdayIndex(point.date)
    const entry = byWeekday.get(index) ?? { revenue: 0, days: 0 }
    entry.revenue += point.revenue
    entry.days += 1
    byWeekday.set(index, entry)
  }

  const dayOfWeek: DayOfWeekStat[] = WEEKDAY_LABELS.map((day, dayIndex) => {
    const entry = byWeekday.get(dayIndex) ?? { revenue: 0, days: 0 }
    const avgRevenue = entry.days ? round(entry.revenue / entry.days, 2) : 0
    return {
      day,
      dayIndex,
      avgRevenue,
      totalRevenue: round(entry.revenue, 2),
      changePercent: entry.days ? percentChange(avgRevenue, avgDailyRevenue) : 0
    }
  })

  const tradingDays = dayOfWeek.filter(day => day.totalRevenue > 0)
  const busiestDay = tradingDays.length
    ? tradingDays.reduce((best, day) => (day.changePercent > best.changePercent ? day : best))
    : null
  const quietestDay = tradingDays.length
    ? tradingDays.reduce((worst, day) => (day.changePercent < worst.changePercent ? day : worst))
    : null

  // Items
  const byItem = new Map<string, { category: string, units: number, revenue: number }>()
  for (const row of rows) {
    const entry = byItem.get(row.itemName) ?? { category: row.category ?? 'Uncategorised', units: 0, revenue: 0 }
    entry.units += row.quantity
    entry.revenue += row.revenue
    byItem.set(row.itemName, entry)
  }

  const topItems: TopItemStat[] = [...byItem.entries()]
    .map(([itemName, totals]) => ({
      itemName,
      category: totals.category,
      unitsSold: totals.units,
      revenue: round(totals.revenue, 2)
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)

  // Category mix
  const byCategory = new Map<string, number>()
  for (const row of rows) {
    const category = row.category ?? 'Uncategorised'
    byCategory.set(category, (byCategory.get(category) ?? 0) + row.revenue)
  }

  const categories: CategoryStat[] = [...byCategory.entries()]
    .map(([category, revenue]) => ({
      category,
      revenue: round(revenue, 2),
      share: totalRevenue ? round((revenue / totalRevenue) * 100, 1) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    dataset: datasetSummary,
    kpis: {
      totalRevenue,
      totalUnits,
      avgDailyRevenue,
      distinctItems: byItem.size,
      revenueChangePercent
    },
    revenueTrend,
    dayOfWeek,
    topItems,
    categories,
    busiestDay,
    quietestDay,
    activeDays,
    generatedAt: new Date().toISOString()
  }
})
