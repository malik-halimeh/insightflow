import {
  outcomeSchema,
  ruleSchema,
  type Dimension,
  type Metric,
  type Outcome,
  type Rule,
  type RuleOperator
} from '../shared/schemas'
import {
  calculateOutcomeVerdict,
  measureOutcomeWindow,
  outcomeWindows,
  type OutcomeMeasurementScope
} from '../server/utils/outcomes'
import { evaluateRule } from '../server/utils/rules'
import { assessQuality } from '../server/utils/versioning'
import {
  PRESENTATION_CREATED_AT,
  PRESENTATION_DATASET_ID,
  PRESENTATION_PERIOD_END,
  buildPresentationSalesLines,
  presentationObjectId,
  presentationSalesDigest,
  presentationSalesSummary
} from './presentation-data'

interface CheckResult {
  name: string
  detail: string
}

const checks: CheckResult[] = []

function check(condition: unknown, name: string, detail: string): asserts condition {
  if (!condition) throw new Error(`${name}: ${detail}`)
  checks.push({ name, detail })
}

const metrics: Metric[] = ['revenue', 'quantity', 'orders']
const comparisonDimensions: Dimension[] = ['dayOfWeek', 'item', 'category']
const comparisonOperators: RuleOperator[] = ['above_average_by', 'below_average_by']
const unsoldDimensions: Dimension[] = ['item', 'category']
const ownerId = presentationObjectId('user', 'owner')

const firstBuild = buildPresentationSalesLines()
const secondBuild = buildPresentationSalesLines()
const rows = firstBuild.map(line => line.row)

check(
  presentationSalesDigest(firstBuild) === presentationSalesDigest(secondBuild),
  'Deterministic output',
  `Both in-process builds produced ${presentationSalesDigest(firstBuild)}.`
)

const summary = presentationSalesSummary(firstBuild)
check(summary.rowCount >= 1_100, 'Rich row volume', `${summary.rowCount} daily item totals were generated.`)
check(summary.tradingDays === 82, 'Trading-day coverage', 'The 84-day period contains exactly two deliberate missing dates.')
check(summary.distinctItems === 16, 'Item coverage', 'All 16 presentation items appear in the data.')
check(summary.periodEnd === PRESENTATION_PERIOD_END, 'Fixed period', `The final trading date is ${PRESENTATION_PERIOD_END}.`)

const quality = assessQuality(rows)
check(
  quality.duplicateRows === 0 && quality.missingDays === 2 && !quality.thin,
  'Upload quality',
  'The real quality check reports zero duplicates, two deliberate missing dates, and sufficient history.'
)

function buildRule(
  metric: Metric,
  dimension: Dimension,
  operator: RuleOperator,
  enabled = true
): Rule {
  const key = `${metric}:${dimension}:${operator}:${enabled ? 'enabled' : 'disabled'}`

  return ruleSchema.parse({
    id: presentationObjectId('verification-rule', key),
    ownerId,
    name: `Verify ${key}`,
    metric,
    dimension,
    operator,
    threshold: operator === 'unsold_for_days' ? 14 : 5,
    advice: 'Use this verified pattern to plan the next trading decision.',
    expectedDirection: 'up',
    enabled
  })
}

const matrixFindings = []
let matrixCount = 0

for (const metric of metrics) {
  for (const dimension of comparisonDimensions) {
    for (const operator of comparisonOperators) {
      const rule = buildRule(metric, dimension, operator)
      const findings = evaluateRule(rows, rule)
      matrixCount++
      check(
        findings.length > 0,
        `Rule matrix ${metric}/${dimension}/${operator}`,
        `${findings.length} finding(s) were generated.`
      )
      matrixFindings.push(...findings)
    }
  }
}

for (const metric of metrics) {
  for (const dimension of unsoldDimensions) {
    const operator: RuleOperator = 'unsold_for_days'
    const rule = buildRule(metric, dimension, operator)
    const findings = evaluateRule(rows, rule)
    matrixCount++
    check(
      findings.length > 0,
      `Rule matrix ${metric}/${dimension}/${operator}`,
      `${findings.length} finding(s) were generated.`
    )
    matrixFindings.push(...findings)
  }
}

check(matrixCount === 24, 'Rule matrix size', '18 comparison configurations plus 6 unsold configurations were evaluated.')

const severities = new Set(matrixFindings.map(finding => finding.severity))
check(severities.has('opportunity'), 'Opportunity severity', 'At least one above-average finding is an opportunity.')
check(severities.has('warning'), 'Warning severity', 'At least one below-average or unsold finding is a warning.')
check(
  !severities.has('info'),
  'Info severity reachability',
  'The current engine cannot emit info from a positive threshold after one-decimal rounding; this is documented, not fabricated.'
)

check(
  evaluateRule(rows, buildRule('revenue', 'item', 'above_average_by', false)).length === 0,
  'Disabled rule branch',
  'A disabled rule produced no findings.'
)
check(
  evaluateRule([], buildRule('revenue', 'item', 'above_average_by')).length === 0,
  'Empty-data branch',
  'An enabled rule produced no findings without sales rows.'
)
check(
  evaluateRule(rows, buildRule('revenue', 'hour', 'above_average_by')).length === 0,
  'Hour branch',
  'Hour analysis remains unavailable because sales rows contain no time field.'
)
check(
  evaluateRule(rows, buildRule('revenue', 'dayOfWeek', 'unsold_for_days')).length === 0,
  'Unsupported unsold dimension branch',
  'An unsold day-of-week rule produced no findings.'
)

const followedDate = '2026-07-25'

function measureItem(itemName: string, measurementFollowedDate = followedDate) {
  const measurementWindows = outcomeWindows(measurementFollowedDate)
  const scope: OutcomeMeasurementScope = {
    metric: 'quantity',
    dimension: 'item',
    dimensionValue: itemName
  }
  const before = measureOutcomeWindow(rows, measurementWindows.before, scope, null)
  const after = measureOutcomeWindow(rows, measurementWindows.after, scope, null)
  const verdict = calculateOutcomeVerdict(before.value, after.value, 'up')
  return { scope, before, after, verdict }
}

function completedOutcome(itemName: string, outcomeFollowedDate = followedDate): Outcome {
  const measured = measureItem(itemName, outcomeFollowedDate)
  const recommendationId = presentationObjectId('verification-recommendation', itemName)

  return outcomeSchema.parse({
    id: presentationObjectId('verification-outcome', itemName),
    recommendationId,
    datasetId: PRESENTATION_DATASET_ID,
    followedDate: outcomeFollowedDate,
    note: null,
    windowDays: 14,
    recommendation: {
      title: `${itemName} outcome`,
      body: `${itemName} was measured in equal periods before and after the decision.`,
      action: `Review the placement and offer for ${itemName}.`,
      metric: measured.scope.metric,
      dimension: measured.scope.dimension,
      dimensionValue: measured.scope.dimensionValue,
      operator: 'below_average_by',
      expectedDirection: 'up',
      recommendationCreatedAt: PRESENTATION_CREATED_AT
    },
    beforeWindow: measured.before.window,
    beforeValue: measured.before.value,
    afterWindow: measured.after.window,
    afterValue: measured.after.value,
    changePercent: measured.verdict.changePercent,
    hasMissingSalesDates: measured.after.window.missingSalesDates > 0,
    status: measured.verdict.status,
    completedAt: PRESENTATION_CREATED_AT,
    createdAt: PRESENTATION_CREATED_AT,
    updatedAt: PRESENTATION_CREATED_AT
  })
}

const improved = completedOutcome('Margherita Pizza')
const worsened = completedOutcome('Beetroot & Feta Salad')
const noClearEffect = completedOutcome('Lasagne', '2026-07-10')
const zeroBaseline = completedOutcome('Lunch Slice')
const pendingMeasurement = measureItem('Garlic Bread')
const pending = outcomeSchema.parse({
  ...completedOutcome('Garlic Bread'),
  id: presentationObjectId('verification-outcome', 'pending-garlic-bread'),
  afterWindow: null,
  afterValue: null,
  changePercent: null,
  hasMissingSalesDates: false,
  status: 'pending',
  completedAt: null,
  beforeWindow: pendingMeasurement.before.window,
  beforeValue: pendingMeasurement.before.value
})

check(improved.status === 'improved', 'Improved outcome', `Margherita Pizza measured ${improved.changePercent}%.`)
check(worsened.status === 'worsened', 'Worsened outcome', `Beetroot & Feta Salad measured ${worsened.changePercent}%.`)
check(
  noClearEffect.status === 'no_clear_effect'
  && (noClearEffect.beforeValue ?? 0) > 0
  && (noClearEffect.afterValue ?? 0) > 0,
  'No-clear-effect outcome',
  `Lasagne measured ${noClearEffect.changePercent}% from nonzero before and after values.`
)
check(pending.status === 'pending', 'Pending outcome', 'The pending outcome contains no after-period result.')
check(
  zeroBaseline.status === 'improved' && zeroBaseline.beforeValue === 0 && zeroBaseline.changePercent === null,
  'Zero-baseline outcome',
  `Lunch Slice moved from ${zeroBaseline.beforeValue} to ${zeroBaseline.afterValue} without an invented percentage.`
)
check(
  improved.hasMissingSalesDates && (improved.afterWindow?.missingSalesDates ?? 0) === 2,
  'Missing-date warning',
  'The completed after window records exactly two missing sales dates.'
)

const publicProjection = {
  slug: 'presentation-margherita-improved',
  displayName: 'Bella Pizza',
  caption: 'A menu placement change was followed by stronger Margherita sales.',
  metricLabel: 'Quantity change after the menu update',
  metricValue: improved.changePercent
}
const publicKeys = new Set(Object.keys(publicProjection))
for (const forbidden of ['revenue', 'beforeValue', 'afterValue', 'datasetId', 'ownerId', 'recommendationId']) {
  check(!publicKeys.has(forbidden), `Public privacy field ${forbidden}`, `${forbidden} is absent from the presentation projection.`)
}

console.log('Presentation data verification passed.')
console.log(`Checks: ${checks.length}`)
console.log(`Digest: ${summary.digest}`)
console.log(`Rows: ${summary.rowCount}`)
console.log(`Rule configurations: ${matrixCount}`)
console.log(`Generated severities: ${[...severities].sort().join(', ')}`)
console.log('Outcome states: pending, improved, no_clear_effect, worsened, zero baseline, missing dates')
