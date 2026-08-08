import { MongoServerError, ObjectId } from 'mongodb'
import {
  OUTCOME_WINDOW_DAYS,
  outcomeCreateSchema,
  outcomeSchema,
  type Outcome,
  type SalesRow
} from '#shared/schemas'
import {
  outcomesCollection,
  recommendationsCollection,
  salesRowsCollection,
  type OutcomeDoc
} from '../../utils/db'
import { requireSession } from '../../utils/auth'
import { requireOwnedDataset } from '../../utils/ownership'
import { measureOutcomeWindow, outcomeWindows } from '../../utils/outcomes'

const DUPLICATE_KEY = 11000

function asOutcome(document: OutcomeDoc | null): Outcome {
  if (!document) {
    throw createError({
      statusCode: 500,
      statusMessage: 'The saved outcome could not be loaded. Please refresh and try again.'
    })
  }

  const { _id, ...outcome } = document
  return outcomeSchema.parse({ id: _id.toHexString(), ...outcome })
}

export default defineEventHandler(async (event): Promise<Outcome> => {
  if (!useRuntimeConfig(event).outcomesEnabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Outcome tracking is not switched on for this site.'
    })
  }

  requireSession(event)

  const parsed = outcomeCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message
        ?? 'Please check the outcome form and try again.'
    })
  }

  const recommendations = await recommendationsCollection()
  const recommendation = await recommendations.findOne({
    _id: new ObjectId(parsed.data.recommendationId)
  })

  if (!recommendation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This recommendation could not be found. Refresh the page and try again.'
    })
  }

  const dataset = await requireOwnedDataset(event, recommendation.datasetId)
  const outcomes = await outcomesCollection()
  const existing = await outcomes.findOne({
    recommendationId: parsed.data.recommendationId
  })

  // A retry returns the first immutable snapshot. This check is for the common
  // path; the unique index and duplicate-key handling below close the race.
  if (existing) {
    return asOutcome(existing)
  }

  if (
    !recommendation.dimensionValue
    || !recommendation.operator
    || !recommendation.expectedDirection
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This finding was generated before outcome tracking, so its result cannot be measured.'
    })
  }

  if (recommendation.dimension === 'hour') {
    throw createError({
      statusCode: 409,
      statusMessage: 'This finding needs time-of-day sales data before its result can be measured.'
    })
  }

  const windows = outcomeWindows(parsed.data.followedDate)
  const rowDocuments = await (await salesRowsCollection())
    .find({
      datasetId: recommendation.datasetId,
      date: { $gte: windows.before.start, $lt: windows.before.endExclusive }
    })
    .sort({ date: 1 })
    .toArray()
  const rows: SalesRow[] = rowDocuments.map(({ _id, ...row }) => ({
    id: _id.toHexString(),
    ...row
  }))
  const before = measureOutcomeWindow(
    rows,
    windows.before,
    {
      metric: recommendation.metric,
      dimension: recommendation.dimension,
      dimensionValue: recommendation.dimensionValue
    },
    dataset.currentVersionId
  )

  if (before.window.sourceRowCount === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'There are no sales rows in the two weeks before that date. Choose a later follow date.'
    })
  }

  const now = new Date().toISOString()
  const id = new ObjectId()
  const outcome = outcomeSchema.parse({
    id: id.toHexString(),
    recommendationId: parsed.data.recommendationId,
    datasetId: recommendation.datasetId,
    followedDate: parsed.data.followedDate,
    note: parsed.data.note || null,
    windowDays: OUTCOME_WINDOW_DAYS,
    recommendation: {
      title: recommendation.title,
      body: recommendation.body,
      action: recommendation.action,
      metric: recommendation.metric,
      dimension: recommendation.dimension,
      dimensionValue: recommendation.dimensionValue,
      operator: recommendation.operator,
      expectedDirection: recommendation.expectedDirection,
      recommendationCreatedAt: recommendation.createdAt
    },
    beforeWindow: before.window,
    beforeValue: before.value,
    afterWindow: null,
    afterValue: null,
    changePercent: null,
    hasMissingSalesDates: false,
    status: 'pending',
    completedAt: null,
    createdAt: now,
    updatedAt: now
  })
  const { id: outcomeId, ...document } = outcome

  try {
    await outcomes.insertOne({ _id: new ObjectId(outcomeId), ...document })
    setResponseStatus(event, 201)
    return outcome
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== DUPLICATE_KEY) {
      throw error
    }

    // Another identical request won the race. The index guarantees there is at
    // most one record, so return that record as the idempotent result.
    return asOutcome(await outcomes.findOne({
      recommendationId: parsed.data.recommendationId
    }))
  }
})
