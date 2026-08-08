import type { DatasetSummary } from '#shared/types/analytics'
import type { ForecastSummary } from '#shared/types/forecast'
import { salesRowsCollection } from '../../utils/db'
import { requireOwnedDataset } from '../../utils/ownership'
import { REQUIRED_DAYS, forecastForward, measureAccuracy, recentActuals } from '../../utils/forecast'

/**
 * What the next week is likely to take, for one data set.
 *
 * Deliberately uncached for now. Caching a private, per-owner response is a decision
 * about who a cached copy can be served to, not about speed, and it is being made
 * separately — see the note in docs/M1-PHASE-2-CHECKLIST.md. Getting the figures
 * right first means the cache is added to something already known to be correct.
 */

/** How far ahead to predict. A week is what an owner orders stock against. */
const HORIZON_DAYS = 7

/** How much recent history to send back, so the chart can draw it beside the forecast. */
const ACTUALS_DAYS = 28

export default defineEventHandler(async (event): Promise<ForecastSummary> => {
  if (!useRuntimeConfig(event).forecastEnabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Forecasting is not switched on for this site.'
    })
  }

  const dataset = await requireOwnedDataset(event, getRouterParam(event, 'datasetId'))
  const datasetId = dataset._id.toHexString()

  const { _id, name, businessType, periodStart, periodEnd, rowCount, createdAt } = dataset
  const summary: DatasetSummary = {
    id: _id.toHexString(),
    name,
    businessType,
    periodStart,
    periodEnd,
    rowCount,
    createdAt
  }

  // `salesRows` always holds the current version's rows, so this needs no version
  // filter — restoring an older upload rewrites them, and the forecast follows.
  // datasetId is stored as a hex string, not an ObjectId.
  const rows = await (await salesRowsCollection()).find({ datasetId }).toArray()

  // One total per trading day, the same aggregation the dashboard's summary does.
  const byDate = new Map<string, number>()
  for (const row of rows) byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.revenue)

  const series = [...byDate.entries()]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const activeDays = series.length
  const insufficientData = activeDays < REQUIRED_DAYS

  return {
    dataset: summary,
    // Said plainly rather than left for the screen to infer, and sent with both
    // numbers so it can tell the owner how far short the history falls rather than
    // only that it does.
    insufficientData,
    activeDays,
    requiredDays: REQUIRED_DAYS,
    points: insufficientData ? [] : forecastForward(series, HORIZON_DAYS),
    actuals: recentActuals(series, ACTUALS_DAYS),
    accuracy: insufficientData ? null : measureAccuracy(series),
    horizonDays: HORIZON_DAYS,
    generatedAt: new Date().toISOString()
  }
})
