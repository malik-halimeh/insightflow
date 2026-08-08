import type {
  Dimension,
  ExpectedDirection,
  Metric,
  Outcome,
  OutcomeDetailResponse,
  OutcomeReadiness,
  OutcomeStatus,
  OutcomeWindow,
  SalesRow
} from '../../shared/schemas'
import {
  OUTCOME_MIN_SALES_DATES,
  OUTCOME_NO_CLEAR_EFFECT_PERCENT,
  OUTCOME_WINDOW_DAYS,
  outcomeSchema
} from '../../shared/schemas/outcome'

const MILLISECONDS_PER_DAY = 86_400_000
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

export interface OutcomeMeasurementScope {
  metric: Metric
  dimension: Dimension
  dimensionValue: string
}

export interface OutcomeWindowBounds {
  start: string
  endExclusive: string
}

export interface OutcomeWindows {
  before: OutcomeWindowBounds
  after: OutcomeWindowBounds
}

export interface OutcomeMeasurement {
  value: number
  window: OutcomeWindow
}

export interface OutcomeVerdict {
  status: Exclude<OutcomeStatus, 'pending'>
  changePercent: number | null
}

function utcDateTime(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime()
}

function addDays(date: string, days: number): string {
  return new Date(utcDateTime(date) + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10)
}

function daysBetween(start: string, end: string): number {
  return Math.floor((utcDateTime(end) - utcDateTime(start)) / MILLISECONDS_PER_DAY)
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

function scopeMatches(row: SalesRow, scope: OutcomeMeasurementScope): boolean {
  if (scope.dimension === 'dayOfWeek') {
    return WEEKDAY_NAMES[new Date(`${row.date}T00:00:00Z`).getUTCDay()] === scope.dimensionValue
  }

  if (scope.dimension === 'item') {
    return row.itemName === scope.dimensionValue
  }

  if (scope.dimension === 'category') {
    return (row.category ?? 'Uncategorised') === scope.dimensionValue
  }

  // The sales-row contract contains dates but no hour or timestamp. Treating an
  // hour finding as measurable would silently compare an empty scope.
  throw new Error('Outcome tracking cannot measure an hour finding without time data.')
}

function metricValue(rows: SalesRow[], metric: Metric): number {
  if (metric === 'revenue') {
    return roundMoney(rows.reduce((sum, row) => sum + row.revenue, 0))
  }

  if (metric === 'quantity') {
    return rows.reduce((sum, row) => sum + row.quantity, 0)
  }

  // This is deliberately the same definition as the recommendation engine:
  // one imported sales row represents one order.
  return rows.length
}

/**
 * Both periods are half-open. The follow date begins the after period and is
 * excluded from the before period, so the two equal windows never overlap.
 */
export function outcomeWindows(followedDate: string): OutcomeWindows {
  return {
    before: {
      start: addDays(followedDate, -OUTCOME_WINDOW_DAYS),
      endExclusive: followedDate
    },
    after: {
      start: followedDate,
      endExclusive: addDays(followedDate, OUTCOME_WINDOW_DAYS)
    }
  }
}

/** Measures one fixed window from the current live rows. */
export function measureOutcomeWindow(
  rows: SalesRow[],
  bounds: OutcomeWindowBounds,
  scope: OutcomeMeasurementScope,
  datasetVersionId: string | null
): OutcomeMeasurement {
  const inWindow = rows.filter(
    row => row.date >= bounds.start && row.date < bounds.endExclusive
  )
  const scopedRows = inWindow.filter(row => scopeMatches(row, scope))
  const distinctSalesDates = new Set(inWindow.map(row => row.date)).size
  const windowDays = Math.max(0, daysBetween(bounds.start, bounds.endExclusive))

  return {
    value: metricValue(scopedRows, scope.metric),
    window: {
      periodStart: bounds.start,
      periodEnd: addDays(bounds.endExclusive, -1),
      sourceRowCount: inWindow.length,
      distinctSalesDates,
      missingSalesDates: Math.max(0, windowDays - distinctSalesDates),
      datasetVersionId
    }
  }
}

/**
 * Readiness uses all sales dates in the after period, not only rows matching the
 * finding's item or weekday. A scoped item with no sales is a real value of zero;
 * it must not be mistaken for an upload that contains no usable period data.
 */
export function calculateOutcomeReadiness(
  rows: SalesRow[],
  followedDate: string,
  today = new Date().toISOString().slice(0, 10)
): OutcomeReadiness {
  const after = outcomeWindows(followedDate).after
  const distinctSalesDates = new Set(
    rows
      .filter(row => row.date >= after.start && row.date < after.endExclusive)
      .map(row => row.date)
  ).size
  const calendarDaysElapsed = Math.max(0, daysBetween(followedDate, today))
  const calendarReady = calendarDaysElapsed >= OUTCOME_WINDOW_DAYS
  const salesDatesReady = distinctSalesDates >= OUTCOME_MIN_SALES_DATES

  return {
    afterPeriodStart: after.start,
    afterPeriodEnd: addDays(after.endExclusive, -1),
    calendarDaysElapsed,
    calendarDaysRequired: OUTCOME_WINDOW_DAYS,
    distinctSalesDates,
    distinctSalesDatesRequired: OUTCOME_MIN_SALES_DATES,
    calendarReady,
    salesDatesReady,
    ready: calendarReady && salesDatesReady
  }
}

/** Applies the agreed three-way verdict, including the explicit zero baseline. */
export function calculateOutcomeVerdict(
  beforeValue: number,
  afterValue: number,
  expectedDirection: ExpectedDirection
): OutcomeVerdict {
  if (beforeValue === 0) {
    return {
      changePercent: null,
      status: afterValue === 0
        ? 'no_clear_effect'
        : expectedDirection === 'up' ? 'improved' : 'worsened'
    }
  }

  const changePercent = roundPercent(((afterValue - beforeValue) / beforeValue) * 100)

  if (Math.abs(changePercent) <= OUTCOME_NO_CLEAR_EFFECT_PERCENT) {
    return { changePercent, status: 'no_clear_effect' }
  }

  const movedUp = changePercent > 0
  const improved = expectedDirection === 'up' ? movedUp : !movedUp

  return {
    changePercent,
    status: improved ? 'improved' : 'worsened'
  }
}

/**
 * Resolves a pending outcome from current rows when both readiness gates pass.
 * The function is pure: persistence decides whether this candidate wins the
 * pending-to-completed race, and completed records are returned unchanged.
 */
export function resolveOutcome(
  outcome: Outcome,
  rows: SalesRow[],
  datasetVersionId: string | null,
  now = new Date().toISOString()
): OutcomeDetailResponse {
  if (outcome.status !== 'pending') {
    return { outcome, readiness: null }
  }

  const readiness = calculateOutcomeReadiness(
    rows,
    outcome.followedDate,
    now.slice(0, 10)
  )

  if (!readiness.ready) {
    return { outcome, readiness }
  }

  const after = measureOutcomeWindow(
    rows,
    outcomeWindows(outcome.followedDate).after,
    {
      metric: outcome.recommendation.metric,
      dimension: outcome.recommendation.dimension,
      dimensionValue: outcome.recommendation.dimensionValue
    },
    datasetVersionId
  )
  const verdict = calculateOutcomeVerdict(
    outcome.beforeValue,
    after.value,
    outcome.recommendation.expectedDirection
  )

  return {
    outcome: outcomeSchema.parse({
      ...outcome,
      afterWindow: after.window,
      afterValue: after.value,
      changePercent: verdict.changePercent,
      hasMissingSalesDates: after.window.missingSalesDates > 0,
      status: verdict.status,
      completedAt: now,
      updatedAt: now
    }),
    readiness: null
  }
}
