import { ObjectId } from 'mongodb'
import {
  recommendationSchema,
  ruleSchema,
  type Recommendation,
  type Rule,
  type RuleCreate,
  type SalesRow
} from '#shared/schemas'

const starterRuleDefinitions: RuleCreate[] = [
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

interface EvaluatedRule {
  rule: Rule
  ruleId: string | null
}

async function rulesToEvaluate(): Promise<EvaluatedRule[]> {
  const documents = await (await rulesCollection())
    .find({})
    .sort({ name: 1 })
    .toArray()

  if (documents.length > 0) {
    return documents
      .map(({ _id, ...rule }) => ruleSchema.parse({
        id: _id.toHexString(),
        ...rule
      }))
      .filter(rule => rule.enabled)
      .map(rule => ({ rule, ruleId: rule.id }))
  }

  // The starter rules keep the first-run experience useful before the owner has
  // saved any rules. They are not database records, so their findings have no
  // ruleId. Once the owner saves a rule, only saved rules are evaluated.
  return starterRuleDefinitions.map(definition => ({
    rule: ruleSchema.parse({
      id: new ObjectId().toHexString(),
      ...definition
    }),
    ruleId: null
  }))
}

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

  const evaluatedRules = await rulesToEvaluate()
  const findings = evaluatedRules.flatMap(({ rule, ruleId }) =>
    evaluateRule(rows, rule).map(finding => ({ finding, ruleId }))
  )
  const createdAt = new Date().toISOString()
  const recommendations = await recommendationsCollection()

  await Promise.all(findings.map(async ({ finding, ruleId }) => {
    // A recommendation must keep the same id across refreshes. Publishing links
    // to this id, so returning a fresh ObjectId on every GET would make an insight
    // appear unpublished as soon as the owner reloaded the page.
    const document = await recommendations.findOneAndUpdate(
      {
        datasetId,
        ruleId,
        title: finding.title,
        metric: finding.metric,
        dimension: finding.dimension
      },
      {
        $set: {
          body: finding.body,
          action: finding.action,
          changePercent: finding.changePercent,
          severity: finding.severity
        },
        $setOnInsert: {
          _id: new ObjectId(),
          datasetId,
          ruleId,
          title: finding.title,
          metric: finding.metric,
          dimension: finding.dimension,
          createdAt
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    if (!document) {
      throw createError({
        statusCode: 500,
        statusMessage: 'This recommendation could not be saved. Please try again.'
      })
    }

    const { _id, ...recommendation } = document
    return recommendationSchema.parse({
      id: _id.toHexString(),
      ...recommendation
    })
  }))

  // Findings are records of what the engine discovered. Removing or disabling a
  // rule stops future evaluation, but it must not strand a public insight by
  // making its private unpublish control disappear.
  const stored = await recommendations
    .find({ datasetId })
    .sort({ createdAt: -1 })
    .toArray()

  return stored.map(({ _id, ...recommendation }) =>
    recommendationSchema.parse({
      id: _id.toHexString(),
      ...recommendation
    })
  )
})
