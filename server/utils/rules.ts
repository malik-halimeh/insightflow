import type {
  Dimension,
  Metric,
  Recommendation,
  Rule,
  SalesRow,
  Severity
} from '#shared/schemas'
import { formatCount, formatPercentChange } from '#shared/format'

type Finding = Pick<
  Recommendation,
  'title' | 'body' | 'action' | 'metric' | 'dimension' | 'changePercent' | 'severity'
>

interface GroupSummary {
  label: string
  value: number
  latestSaleDate: string
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function metricValue(row: SalesRow, metric: Metric): number {
  if (metric === 'revenue') {
    return row.revenue
  }

  if (metric === 'quantity') {
    return row.quantity
  }

  return 1
}

function groupLabel(row: SalesRow, dimension: Dimension): string | null {
  if (dimension === 'dayOfWeek') {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay()
    return WEEKDAY_NAMES[weekday] ?? null
  }

  if (dimension === 'item') {
    return row.itemName
  }

  if (dimension === 'category') {
    return row.category ?? 'Uncategorised'
  }

  // SalesRow contains a calendar date but no time, so hour rules cannot
  // be evaluated until the sales contract includes an hour or timestamp.
  return null
}

function summariseGroups(
  rows: SalesRow[],
  metric: Metric,
  dimension: Dimension
): GroupSummary[] {
  const groups = new Map<string, GroupSummary>()

  for (const row of rows) {
    const label = groupLabel(row, dimension)

    if (!label) {
      continue
    }

    const current = groups.get(label)
    const value = metricValue(row, metric)

    if (!current) {
      groups.set(label, {
        label,
        value,
        latestSaleDate: row.date
      })
      continue
    }

    current.value += value

    if (row.date > current.latestSaleDate) {
      current.latestSaleDate = row.date
    }
  }

  return [...groups.values()]
}

function percentageChange(value: number, average: number): number {
  if (average === 0) {
    return 0
  }

  return round1(((value - average) / average) * 100)
}

function severityForChange(changePercent: number): Severity {
  if (changePercent > 0.05) {
    return 'opportunity'
  }

  if (changePercent < -0.05) {
    return 'warning'
  }

  return 'info'
}

function buildComparisonFinding(
  rule: Rule,
  group: GroupSummary,
  changePercent: number
): Finding {
  const direction = changePercent >= 0 ? 'above' : 'below'

  return {
    title: `${group.label} is ${direction} average`,
    body: `${group.label} is ${formatPercentChange(changePercent)} compared with the average for this measure.`,
    action: rule.advice,
    metric: rule.metric,
    dimension: rule.dimension,
    changePercent,
    severity: severityForChange(changePercent)
  }
}

function evaluateComparisonRule(rows: SalesRow[], rule: Rule): Finding[] {
  const groups = summariseGroups(rows, rule.metric, rule.dimension)

  if (groups.length === 0) {
    return []
  }

  const average = groups.reduce((sum, group) => sum + group.value, 0) / groups.length

  return groups.flatMap((group) => {
    const changePercent = percentageChange(group.value, average)

    if (
      rule.operator === 'above_average_by'
      && changePercent >= rule.threshold
    ) {
      return [buildComparisonFinding(rule, group, changePercent)]
    }

    if (
      rule.operator === 'below_average_by'
      && changePercent <= -rule.threshold
    ) {
      return [buildComparisonFinding(rule, group, changePercent)]
    }

    return []
  })
}

function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00Z`).getTime()
  const endTime = new Date(`${end}T00:00:00Z`).getTime()

  return Math.floor((endTime - startTime) / 86_400_000)
}

function evaluateUnsoldRule(rows: SalesRow[], rule: Rule): Finding[] {
  if (rule.dimension !== 'item' && rule.dimension !== 'category') {
    return []
  }

  const latestDatasetDate = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.date > latest) {
      return row.date
    }

    return latest
  }, null)

  if (!latestDatasetDate) {
    return []
  }

  const groups = summariseGroups(rows, rule.metric, rule.dimension)

  return groups.flatMap((group) => {
    const unsoldDays = daysBetween(group.latestSaleDate, latestDatasetDate)

    if (unsoldDays < rule.threshold) {
      return []
    }

    return [{
      title: `${group.label} has not sold for ${unsoldDays} days`,
      body: `${group.label} has no recorded sales in the latest ${formatCount(unsoldDays)} days of this data set.`,
      action: rule.advice,
      metric: rule.metric,
      dimension: rule.dimension,
      changePercent: 0,
      severity: 'warning' as const
    }]
  })
}

export function evaluateRule(rows: SalesRow[], rule: Rule): Finding[] {
  if (!rule.enabled || rows.length === 0 || rule.dimension === 'hour') {
    return []
  }

  if (rule.operator === 'unsold_for_days') {
    return evaluateUnsoldRule(rows, rule)
  }

  return evaluateComparisonRule(rows, rule)
}

export function generateFindings(
  rows: SalesRow[],
  rules: Rule[]
): Finding[] {
  return rules.flatMap(rule => evaluateRule(rows, rule))
}
