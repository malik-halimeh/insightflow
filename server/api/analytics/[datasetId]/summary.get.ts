// Owner: M3
// GET /api/analytics/:datasetId/summary
//
// Turns raw salesRows for one dataset into the numbers the dashboard (and,
// downstream, M4's recommendation copy + M5's public feed) actually needs:
// revenue trend, day-of-week performance vs the weekly average, top items,
// and category mix. Every delta follows the same rule as the design system's
// "delta chip": signed %, tone flat inside +/-3%, positive/negative outside it.

import { ObjectId } from 'mongodb'
import type {
  AnalyticsSummary,
  CategoryStat,
  DatasetSummary,
  DayOfWeekStat,
  DeltaTone,
  DeltaValue,
  RevenuePoint,
  TopItemStat,
} from '~~/shared/types/analytics'
// Explicit import instead of relying on Nitro's server/utils auto-import —
// see the note in server/api/analytics/datasets.get.ts.
import { getCollection } from '~~/server/utils/db'

interface SalesRowDoc {
  _id: ObjectId
  datasetId: string
  date: string
  itemName: string
  category: string
  quantity: number
  unitPrice: number
  revenue: number
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FLAT_THRESHOLD = 3

function round(n: number, dp = 0): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function tone(value: number): DeltaTone {
  if (Math.abs(value) < FLAT_THRESHOLD) return 'flat'
  return value > 0 ? 'positive' : 'negative'
}

function delta(current: number, baseline: number): DeltaValue {
  if (!baseline) return { value: 0, tone: 'flat' }
  const value = round(((current - baseline) / baseline) * 100)
  return { value, tone: tone(value) }
}

// Mon=0 ... Sun=6, from a 'YYYY-MM-DD' string, parsed as UTC to dodge TZ drift.
function weekdayIndex(dateStr: string): number {
  const jsDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
  return (jsDay + 6) % 7 // 0=Mon..6=Sun
}

export default defineEventHandler(async (event): Promise<AnalyticsSummary> => {
  const datasetId = getRouterParam(event, 'datasetId')

  if (!datasetId || !ObjectId.isValid(datasetId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid dataset id' })
  }

  const datasetsCol = await getCollection('datasets')
  const dataset = await datasetsCol.findOne({ _id: new ObjectId(datasetId) })

  if (!dataset) {
    throw createError({ statusCode: 404, statusMessage: 'Dataset not found' })
  }

  const rowsCol = await getCollection<SalesRowDoc>('salesRows')
  // datasetId on salesRows is stored as a plain string, not an ObjectId.
  const rows = await rowsCol.find({ datasetId: datasetId }).toArray()

  const datasetSummary: DatasetSummary = {
    _id: datasetId,
    name: String(dataset.name ?? 'Untitled dataset'),
    businessType: String(dataset.businessType ?? 'business'),
    periodStart: String(dataset.periodStart ?? ''),
    periodEnd: String(dataset.periodEnd ?? ''),
    rowCount: Number(dataset.rowCount ?? rows.length),
    createdAt: String(dataset.createdAt ?? ''),
  }

  if (rows.length === 0) {
    return {
      dataset: datasetSummary,
      kpis: {
        totalRevenue: 0,
        totalUnits: 0,
        avgDailyRevenue: 0,
        distinctItems: 0,
        revenueDelta: { value: 0, tone: 'flat' },
      },
      revenueTrend: [],
      dayOfWeek: [],
      topItems: [],
      categories: [],
      busiestDay: null,
      quietestDay: null,
      generatedAt: new Date().toISOString(),
    }
  }

  // ---- revenue trend (by day) ------------------------------------------
  const byDate = new Map<string, { revenue: number; units: number }>()
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { revenue: 0, units: 0 }
    entry.revenue += Number(r.revenue) || 0
    entry.units += Number(r.quantity) || 0
    byDate.set(r.date, entry)
  }
  const revenueTrend: RevenuePoint[] = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => ({ date, revenue: round(v.revenue, 2), units: v.units }))

  const totalRevenue = round(
    revenueTrend.reduce((sum, p) => sum + p.revenue, 0),
    2,
  )
  const totalUnits = revenueTrend.reduce((sum, p) => sum + p.units, 0)
  const activeDays = revenueTrend.length
  const avgDailyRevenue = round(totalRevenue / activeDays, 2)

  // second half of the period vs first half, per-day average so uneven
  // splits don't skew the comparison
  const mid = Math.floor(revenueTrend.length / 2)
  const firstHalf = revenueTrend.slice(0, mid)
  const secondHalf = revenueTrend.slice(mid)
  const avg = (arr: RevenuePoint[]) =>
    arr.length ? arr.reduce((s, p) => s + p.revenue, 0) / arr.length : 0
  const revenueDelta = delta(avg(secondHalf), avg(firstHalf))

  // ---- day of week vs weekly average ------------------------------------
  const byWeekday = new Map<number, { revenue: number; days: number }>()
  for (const p of revenueTrend) {
    const idx = weekdayIndex(p.date)
    const entry = byWeekday.get(idx) ?? { revenue: 0, days: 0 }
    entry.revenue += p.revenue
    entry.days += 1
    byWeekday.set(idx, entry)
  }
  const overallAvgPerDay = totalRevenue / activeDays
  const dayOfWeek: DayOfWeekStat[] = WEEKDAY_LABELS.map((day, dayIndex) => {
    const entry = byWeekday.get(dayIndex) ?? { revenue: 0, days: 0 }
    const avgRevenue = entry.days ? round(entry.revenue / entry.days, 2) : 0
    return {
      day,
      dayIndex,
      avgRevenue,
      totalRevenue: round(entry.revenue, 2),
      delta: delta(avgRevenue, overallAvgPerDay),
    }
  })

  const daysWithData = dayOfWeek.filter((d) => d.totalRevenue > 0)
  const busiestDay = daysWithData.length
    ? daysWithData.reduce((a, b) => (b.delta.value > a.delta.value ? b : a))
    : null
  const quietestDay = daysWithData.length
    ? daysWithData.reduce((a, b) => (b.delta.value < a.delta.value ? b : a))
    : null

  // ---- top items ----------------------------------------------------------
  const byItem = new Map<string, { category: string; units: number; revenue: number }>()
  for (const r of rows) {
    const entry = byItem.get(r.itemName) ?? { category: r.category, units: 0, revenue: 0 }
    entry.units += Number(r.quantity) || 0
    entry.revenue += Number(r.revenue) || 0
    byItem.set(r.itemName, entry)
  }
  const rankedItems = [...byItem.entries()]
    .map(([itemName, v]) => ({ itemName, category: v.category, unitsSold: v.units, revenue: round(v.revenue, 2) }))
    .sort((a, b) => b.unitsSold - a.unitsSold)

  const topItems: TopItemStat[] = rankedItems.slice(0, 5).map((item, i, arr) => {
    const next = arr[i + 1] ?? rankedItems[rankedItems.indexOf(item) + 1]
    return {
      ...item,
      deltaVsNext: next ? delta(item.unitsSold, next.unitsSold) : null,
    }
  })

  // ---- category mix --------------------------------------------------------
  const byCategory = new Map<string, number>()
  for (const r of rows) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + (Number(r.revenue) || 0))
  }
  const categories: CategoryStat[] = [...byCategory.entries()]
    .map(([category, revenue]) => ({
      category,
      revenue: round(revenue, 2),
      share: totalRevenue ? round((revenue / totalRevenue) * 100, 1) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const distinctItems = byItem.size

  return {
    dataset: datasetSummary,
    kpis: {
      totalRevenue,
      totalUnits,
      avgDailyRevenue,
      distinctItems,
      revenueDelta,
    },
    revenueTrend,
    dayOfWeek,
    topItems,
    categories,
    busiestDay,
    quietestDay,
    generatedAt: new Date().toISOString(),
  }
})
