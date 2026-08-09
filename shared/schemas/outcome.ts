import { z } from 'zod'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'
import {
  dimensionSchema,
  expectedDirectionSchema,
  metricSchema,
  ruleOperatorSchema
} from './rule'

/** The before and after periods each cover fourteen calendar days. */
export const OUTCOME_WINDOW_DAYS = 14 as const

/** A result needs sales recorded on at least half of its after-window dates. */
export const OUTCOME_MIN_SALES_DATES = 7 as const

/**
 * Changes from -5% through +5% are no clear effect, including both edges.
 * This is a product tolerance, not a claim of statistical significance.
 */
export const OUTCOME_NO_CLEAR_EFFECT_PERCENT = 5 as const

export const outcomeStatusSchema = z.enum(
  ['pending', 'improved', 'no_clear_effect', 'worsened'],
  { error: 'Please provide a valid outcome status.' }
)

export type OutcomeStatus = z.infer<typeof outcomeStatusSchema>

/**
 * The recommendation facts frozen when the owner records the decision. An
 * outcome therefore stays understandable if the recommendation or rule changes
 * or disappears later.
 */
export const outcomeRecommendationSnapshotSchema = z.object({
  title: z.string().min(1, 'The original recommendation needs a title.'),
  body: z.string().min(1, 'The original recommendation needs an explanation.'),
  action: z.string().min(1, 'The original recommendation needs an action.'),
  metric: metricSchema,
  dimension: dimensionSchema,
  dimensionValue: z.string().min(1, 'The measured scope needs an exact value.'),
  operator: ruleOperatorSchema,
  expectedDirection: expectedDirectionSchema,
  recommendationCreatedAt: isoDateTimeSchema
})

export type OutcomeRecommendationSnapshot = z.infer<
  typeof outcomeRecommendationSnapshotSchema
>

/**
 * The evidence behind one measurement. The absolute metric value is stored on
 * the outcome beside this window so zero baselines remain representable without
 * inventing a percentage.
 */
export const outcomeWindowSchema = z.object({
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  sourceRowCount: z
    .number()
    .int('The source row count must be a whole number.')
    .nonnegative('The source row count cannot be negative.'),
  distinctSalesDates: z
    .number()
    .int('The sales-date count must be a whole number.')
    .nonnegative('The sales-date count cannot be negative.'),
  missingSalesDates: z
    .number()
    .int('The missing-date count must be a whole number.')
    .nonnegative('The missing-date count cannot be negative.'),
  // Null when versioning was disabled for the upload that supplied the rows.
  datasetVersionId: idSchema.nullable()
}).refine(window => window.periodEnd >= window.periodStart, {
  error: 'The measurement window cannot end before it starts.',
  path: ['periodEnd']
})

export type OutcomeWindow = z.infer<typeof outcomeWindowSchema>

const metricValueSchema = z
  .number({ error: 'Please provide the measured value as a number.' })
  .nonnegative('A measured value cannot be negative.')

const outcomeRecordSchema = z.object({
  id: idSchema,
  recommendationId: idSchema,
  datasetId: idSchema,
  followedDate: isoDateSchema,
  note: z.string().max(500, 'Please keep the note to 500 characters or fewer.').nullable(),
  windowDays: z.literal(OUTCOME_WINDOW_DAYS),
  recommendation: outcomeRecommendationSnapshotSchema,

  // Immutable from the moment the owner records that they followed the advice.
  beforeWindow: outcomeWindowSchema,
  beforeValue: metricValueSchema,

  // Null while pending, then frozen together when readiness is first satisfied.
  afterWindow: outcomeWindowSchema.nullable(),
  afterValue: metricValueSchema.nullable(),
  changePercent: z.number({ error: 'Please provide the comparison as a number.' }).nullable(),
  hasMissingSalesDates: z.boolean(),
  status: outcomeStatusSchema,
  completedAt: isoDateTimeSchema.nullable(),

  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
})

/**
 * Cross-field invariants keep stored records honest:
 *
 * - pending records have no after result;
 * - completed records have all after evidence;
 * - percentage change is null exactly when the before value is zero;
 * - a zero baseline uses the raw values and expected direction for its verdict.
 */
export const outcomeSchema = outcomeRecordSchema.superRefine((outcome, context) => {
  const completedValues = [
    outcome.afterWindow,
    outcome.afterValue,
    outcome.completedAt
  ]

  if (outcome.status === 'pending') {
    if (completedValues.some(value => value !== null) || outcome.changePercent !== null) {
      context.addIssue({
        code: 'custom',
        message: 'A pending outcome cannot already contain an after result.',
        path: ['status']
      })
    }

    if (outcome.hasMissingSalesDates) {
      context.addIssue({
        code: 'custom',
        message: 'Missing after-period sales dates are known only after completion.',
        path: ['hasMissingSalesDates']
      })
    }

    return
  }

  if (completedValues.some(value => value === null)) {
    context.addIssue({
      code: 'custom',
      message: 'A completed outcome must contain its after window, value and completion time.',
      path: ['status']
    })
    return
  }

  if (
    outcome.afterWindow
    && outcome.hasMissingSalesDates !== (outcome.afterWindow.missingSalesDates > 0)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'The missing-sales-date warning must match the frozen after window.',
      path: ['hasMissingSalesDates']
    })
  }

  if (outcome.beforeValue === 0) {
    if (outcome.changePercent !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Percentage change is undefined when the before value is zero.',
        path: ['changePercent']
      })
    }

    const zeroBaselineStatus = outcome.afterValue === 0
      ? 'no_clear_effect'
      : outcome.recommendation.expectedDirection === 'up'
        ? 'improved'
        : 'worsened'

    if (outcome.status !== zeroBaselineStatus) {
      context.addIssue({
        code: 'custom',
        message: 'The zero-baseline verdict does not match the after value and expected direction.',
        path: ['status']
      })
    }
  } else if (outcome.changePercent === null) {
    context.addIssue({
      code: 'custom',
      message: 'A non-zero baseline must have a percentage comparison.',
      path: ['changePercent']
    })
  } else {
    const expectedStatus = Math.abs(outcome.changePercent) <= OUTCOME_NO_CLEAR_EFFECT_PERCENT
      ? 'no_clear_effect'
      : outcome.recommendation.expectedDirection === 'up'
        ? outcome.changePercent > 0 ? 'improved' : 'worsened'
        : outcome.changePercent < 0 ? 'improved' : 'worsened'

    if (outcome.status !== expectedStatus) {
      context.addIssue({
        code: 'custom',
        message: 'The verdict does not match the percentage change and expected direction.',
        path: ['status']
      })
    }
  }
})

export type Outcome = z.infer<typeof outcomeSchema>

/**
 * The only values the owner submits. Identity, recommendation context, snapshots,
 * verdicts and timestamps are all derived or assigned by the server.
 */
export const outcomeCreateSchema = z.object({
  recommendationId: idSchema,
  followedDate: isoDateSchema.refine(
    date => date <= new Date().toISOString().slice(0, 10),
    { error: 'The date followed cannot be in the future.' }
  ),
  note: z
    .string()
    .trim()
    .max(500, 'Please keep the note to 500 characters or fewer.')
    .optional()
})

export type OutcomeCreate = z.infer<typeof outcomeCreateSchema>

/** What recommendation cards and the scoreboard need, without full snapshots. */
export const outcomeSummarySchema = z.object({
  id: idSchema,
  recommendationId: idSchema,
  datasetId: idSchema,
  followedDate: isoDateSchema,
  note: z.string().max(500).nullable(),
  status: outcomeStatusSchema,
  title: z.string().min(1),
  metric: metricSchema,
  dimension: dimensionSchema,
  dimensionValue: z.string().min(1),
  expectedDirection: expectedDirectionSchema,
  beforeValue: metricValueSchema,
  afterValue: metricValueSchema.nullable(),
  changePercent: z.number().nullable(),
  hasMissingSalesDates: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
})

export type OutcomeSummary = z.infer<typeof outcomeSummarySchema>

export const outcomeScoreboardSchema = z.object({
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  improved: z.number().int().nonnegative(),
  noClearEffect: z.number().int().nonnegative(),
  worsened: z.number().int().nonnegative(),
  // Improved divided by every completed outcome, including zero baselines.
  improvementRate: z.number().min(0).max(100).nullable()
}).superRefine((scoreboard, context) => {
  if (scoreboard.completed !== scoreboard.improved + scoreboard.noClearEffect + scoreboard.worsened) {
    context.addIssue({
      code: 'custom',
      message: 'Completed outcomes must equal the three completed verdict groups.',
      path: ['completed']
    })
  }

  if (scoreboard.total !== scoreboard.completed + scoreboard.pending) {
    context.addIssue({
      code: 'custom',
      message: 'Total outcomes must equal completed plus pending outcomes.',
      path: ['total']
    })
  }

  if (
    (scoreboard.completed === 0 && scoreboard.improvementRate !== null)
    || (scoreboard.completed > 0 && scoreboard.improvementRate === null)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'The improvement rate is available exactly when completed outcomes exist.',
      path: ['improvementRate']
    })
  }
})

export type OutcomeScoreboard = z.infer<typeof outcomeScoreboardSchema>

export const outcomeListResponseSchema = z.object({
  outcomes: z.array(outcomeSummarySchema),
  scoreboard: outcomeScoreboardSchema
})

export type OutcomeListResponse = z.infer<typeof outcomeListResponseSchema>

/** Why a pending outcome is or is not ready to be completed. */
export const outcomeReadinessSchema = z.object({
  afterPeriodStart: isoDateSchema,
  afterPeriodEnd: isoDateSchema,
  calendarDaysElapsed: z.number().int().nonnegative(),
  calendarDaysRequired: z.literal(OUTCOME_WINDOW_DAYS),
  distinctSalesDates: z.number().int().nonnegative(),
  distinctSalesDatesRequired: z.literal(OUTCOME_MIN_SALES_DATES),
  calendarReady: z.boolean(),
  salesDatesReady: z.boolean(),
  ready: z.boolean()
}).superRefine((readiness, context) => {
  const expectedCalendarReady = readiness.calendarDaysElapsed >= readiness.calendarDaysRequired
  const expectedSalesDatesReady = readiness.distinctSalesDates >= readiness.distinctSalesDatesRequired

  if (readiness.calendarReady !== expectedCalendarReady) {
    context.addIssue({
      code: 'custom',
      message: 'Calendar readiness does not match the elapsed-day count.',
      path: ['calendarReady']
    })
  }

  if (readiness.salesDatesReady !== expectedSalesDatesReady) {
    context.addIssue({
      code: 'custom',
      message: 'Sales-date readiness does not match the distinct-date count.',
      path: ['salesDatesReady']
    })
  }

  if (readiness.ready !== (expectedCalendarReady && expectedSalesDatesReady)) {
    context.addIssue({
      code: 'custom',
      message: 'An outcome is ready only when both readiness conditions are met.',
      path: ['ready']
    })
  }
})

export type OutcomeReadiness = z.infer<typeof outcomeReadinessSchema>

export const outcomeDetailResponseSchema = z.object({
  outcome: outcomeSchema,
  // Completed outcomes need no live readiness data because their result is frozen.
  readiness: outcomeReadinessSchema.nullable()
})

export type OutcomeDetailResponse = z.infer<typeof outcomeDetailResponseSchema>
