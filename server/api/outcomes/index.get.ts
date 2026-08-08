import { ObjectId } from 'mongodb'
import {
  outcomeListResponseSchema,
  outcomeSchema,
  outcomeSummarySchema,
  type Outcome,
  type OutcomeListResponse,
  type OutcomeSummary,
  type SalesRow
} from '#shared/schemas'
import {
  outcomesCollection,
  salesRowsCollection,
  type OutcomeDoc
} from '../../utils/db'
import { ownedDatasetIds, requireOwnedDataset } from '../../utils/ownership'
import { outcomeWindows, resolveOutcome } from '../../utils/outcomes'

function asOutcome(document: OutcomeDoc): Outcome {
  const { _id, ...outcome } = document
  return outcomeSchema.parse({ id: _id.toHexString(), ...outcome })
}

function asSummary(outcome: Outcome): OutcomeSummary {
  return outcomeSummarySchema.parse({
    id: outcome.id,
    recommendationId: outcome.recommendationId,
    datasetId: outcome.datasetId,
    followedDate: outcome.followedDate,
    note: outcome.note,
    status: outcome.status,
    title: outcome.recommendation.title,
    metric: outcome.recommendation.metric,
    dimension: outcome.recommendation.dimension,
    dimensionValue: outcome.recommendation.dimensionValue,
    expectedDirection: outcome.recommendation.expectedDirection,
    beforeValue: outcome.beforeValue,
    afterValue: outcome.afterValue,
    changePercent: outcome.changePercent,
    hasMissingSalesDates: outcome.hasMissingSalesDates,
    createdAt: outcome.createdAt,
    updatedAt: outcome.updatedAt
  })
}

export default defineEventHandler(async (event): Promise<OutcomeListResponse> => {
  if (!useRuntimeConfig(event).outcomesEnabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Outcome tracking is not switched on for this site.'
    })
  }

  const datasetIds = await ownedDatasetIds(event)
  const outcomes = await outcomesCollection()
  const documents = await outcomes
    .find({ datasetId: { $in: datasetIds } })
    .sort({ createdAt: -1 })
    .toArray()
  const resolved: Outcome[] = []

  for (const document of documents) {
    const outcome = asOutcome(document)
    if (outcome.status !== 'pending') {
      resolved.push(outcome)
      continue
    }

    const dataset = await requireOwnedDataset(event, outcome.datasetId)
    const after = outcomeWindows(outcome.followedDate).after
    const rowDocuments = await (await salesRowsCollection())
      .find({
        datasetId: outcome.datasetId,
        date: { $gte: after.start, $lt: after.endExclusive }
      })
      .sort({ date: 1 })
      .toArray()
    const rows: SalesRow[] = rowDocuments.map(({ _id, ...row }) => ({
      id: _id.toHexString(),
      ...row
    }))
    const detail = resolveOutcome(outcome, rows, dataset.currentVersionId)

    if (detail.outcome.status === 'pending') {
      resolved.push(detail.outcome)
      continue
    }

    const completed = detail.outcome
    const updated = await outcomes.findOneAndUpdate(
      { _id: new ObjectId(completed.id), status: 'pending' },
      {
        $set: {
          afterWindow: completed.afterWindow,
          afterValue: completed.afterValue,
          changePercent: completed.changePercent,
          hasMissingSalesDates: completed.hasMissingSalesDates,
          status: completed.status,
          completedAt: completed.completedAt,
          updatedAt: completed.updatedAt
        }
      },
      { returnDocument: 'after' }
    )
    const persisted = updated ?? await outcomes.findOne({
      _id: new ObjectId(completed.id)
    })

    // Dataset deletion cascades outcomes. If it raced this list request, omit the
    // now-deleted record instead of returning a stale in-memory comparison.
    if (persisted) {
      resolved.push(asOutcome(persisted))
    }
  }

  const summaries = resolved.map(asSummary)
  const improved = summaries.filter(outcome => outcome.status === 'improved').length
  const noClearEffect = summaries.filter(
    outcome => outcome.status === 'no_clear_effect'
  ).length
  const worsened = summaries.filter(outcome => outcome.status === 'worsened').length
  const pending = summaries.filter(outcome => outcome.status === 'pending').length
  const completed = improved + noClearEffect + worsened

  return outcomeListResponseSchema.parse({
    outcomes: summaries,
    scoreboard: {
      total: summaries.length,
      completed,
      pending,
      improved,
      noClearEffect,
      worsened,
      improvementRate: completed === 0
        ? null
        : Math.round((improved / completed) * 1000) / 10
    }
  })
})
