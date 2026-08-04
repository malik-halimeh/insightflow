import { ObjectId } from 'mongodb'
import {
  recommendationSchema,
  ruleSchema,
  type Recommendation,
  type Rule,
  type SalesRow
} from '#shared/schemas'

const starterRuleDefinitions: Array<Omit<Rule, 'id'>> = [
  {
    name: 'Busy days',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    operator: 'above_average_by',
    threshold: 20,
    advice: 'Prepare extra stock and schedule enough staff before this busy day.',
    enabled: true
  },
  {
    name: 'Quiet days',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    operator: 'below_average_by',
    threshold: 15,
    advice: 'Consider running an offer or promotion to bring in more customers on this day.',
    enabled: true
  },
  {
    name: 'Low-selling items',
    metric: 'quantity',
    dimension: 'item',
    operator: 'below_average_by',
    threshold: 70,
    advice: 'Review whether this item needs a different offer or should remain on the menu.',
    enabled: true
  }
]

export default defineEventHandler(async (event): Promise<Recommendation[]> => {
  requireSession(event)

  const datasets = await datasetsCollection()
  const latestDataset = await datasets.findOne(
    {},
    { sort: { createdAt: -1 } }
  )

  if (!latestDataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No data set was found. Upload sales data before viewing recommendations.'
    })
  }

  const datasetId = latestDataset._id.toHexString()
  const salesRows = await salesRowsCollection()

  const documents = await salesRows
    .find({ datasetId })
    .sort({ date: 1 })
    .toArray()

  if (documents.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This data set has no sales rows to analyse.'
    })
  }

  const rows: SalesRow[] = documents.map(({ _id, ...row }) => ({
    id: _id.toHexString(),
    ...row
  }))

  const rules = starterRuleDefinitions.map(definition =>
    ruleSchema.parse({
      id: new ObjectId().toHexString(),
      ...definition
    })
  )

  const findings = generateFindings(rows, rules)
  const createdAt = new Date().toISOString()

  return findings.map(finding =>
    recommendationSchema.parse({
      id: new ObjectId().toHexString(),
      datasetId,
      ruleId: null,
      ...finding,
      createdAt
    })
  )
})