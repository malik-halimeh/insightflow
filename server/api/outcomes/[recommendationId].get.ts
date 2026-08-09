import { ObjectId } from 'mongodb'
import {
  idSchema,
  outcomeDetailResponseSchema,
  outcomeSchema,
  type Outcome,
  type OutcomeDetailResponse,
  type SalesRow
} from '#shared/schemas'
import {
  outcomesCollection,
  salesRowsCollection,
  type OutcomeDoc
} from '../../utils/db'
import { requireSession } from '../../utils/auth'
import { requireOwnedDataset } from '../../utils/ownership'
import { outcomeWindows, resolveOutcome } from '../../utils/outcomes'

function asOutcome(document: OutcomeDoc): Outcome {
  const { _id, ...outcome } = document
  return outcomeSchema.parse({ id: _id.toHexString(), ...outcome })
}

export default defineEventHandler(async (event): Promise<OutcomeDetailResponse> => {
  if (!useRuntimeConfig(event).outcomesEnabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Outcome tracking is not switched on for this site.'
    })
  }

  requireSession(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'recommendationId'))
  if (!parsedId.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedId.error.issues[0]?.message
    })
  }

  const outcomes = await outcomesCollection()
  const document = await outcomes.findOne({ recommendationId: parsedId.data })
  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No outcome has been recorded for this recommendation.'
    })
  }

  const dataset = await requireOwnedDataset(event, document.datasetId)
  const outcome = asOutcome(document)

  if (outcome.status !== 'pending') {
    return outcomeDetailResponseSchema.parse({ outcome, readiness: null })
  }

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
    return outcomeDetailResponseSchema.parse(detail)
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

  // A parallel read may have completed it first. Either result is the same
  // immutable comparison; reload rather than attempting a second calculation.
  const persisted = updated ?? await outcomes.findOne({ _id: new ObjectId(completed.id) })
  if (!persisted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This outcome no longer exists.'
    })
  }

  return outcomeDetailResponseSchema.parse({
    outcome: asOutcome(persisted),
    readiness: null
  })
})
