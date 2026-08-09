import {
  businessTypeSchema,
  dimensionSchema,
  isoDateTimeSchema,
  metricSchema,
  ruleOperatorSchema,
  type BusinessType,
  type Metric,
  type RuleOperator
} from '#shared/schemas'
import { benchmarkSchema, type Benchmark } from '#shared/schemas/benchmark'
import { publishedInsightsCollection, type PublishedInsightDoc } from '../../utils/db'

const MINIMUM_CONTRIBUTORS = 5

type SupportedOperator = Extract<
  RuleOperator,
  'above_average_by' | 'below_average_by'
>

interface EligiblePublication {
  businessType: BusinessType
  metric: Metric
  dimension: 'dayOfWeek'
  dimensionValue: string
  operator: SupportedOperator
  metricValue: number
  contributorId: string
  publishedAtMs: number
}

interface ContributorValue {
  metricValue: number
  publishedAtMs: number
}

interface BenchmarkGroup {
  identity: Pick<
    Benchmark,
    'businessType' | 'metric' | 'dimension' | 'dimensionValue' | 'operator'
  >
  contributors: Map<string, ContributorValue>
}

function asEligiblePublication(
  document: PublishedInsightDoc
): EligiblePublication | null {
  const businessType = businessTypeSchema.safeParse(document.businessType)
  const metric = metricSchema.safeParse(document.metric)
  const dimension = dimensionSchema.safeParse(document.dimension)
  const operator = ruleOperatorSchema.safeParse(document.operator)
  const publishedAt = isoDateTimeSchema.safeParse(document.publishedAt)

  if (
    !businessType.success
    || !metric.success
    || !dimension.success
    || dimension.data !== 'dayOfWeek'
    || !operator.success
    || (operator.data !== 'above_average_by' && operator.data !== 'below_average_by')
    || typeof document.dimensionValue !== 'string'
    || document.dimensionValue.length === 0
    || typeof document.contributorId !== 'string'
    || document.contributorId.length === 0
    || typeof document.metricValue !== 'number'
    || !Number.isFinite(document.metricValue)
    || !publishedAt.success
  ) {
    return null
  }

  const publishedAtMs = Date.parse(publishedAt.data)
  if (!Number.isFinite(publishedAtMs)) return null

  return {
    businessType: businessType.data,
    metric: metric.data,
    dimension: dimension.data,
    dimensionValue: document.dimensionValue,
    operator: operator.data,
    metricValue: document.metricValue,
    contributorId: document.contributorId,
    publishedAtMs
  }
}

function groupKey(publication: EligiblePublication): string {
  return JSON.stringify([
    publication.businessType,
    publication.metric,
    publication.dimension,
    publication.dimensionValue,
    publication.operator
  ])
}

export default defineEventHandler(async (event): Promise<Benchmark[]> => {
  if (!useRuntimeConfig(event).benchmarksEnabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Anonymous benchmarking is not switched on for this site.'
    })
  }

  const documents = await (await publishedInsightsCollection()).find({}).toArray()
  const groups = new Map<string, BenchmarkGroup>()

  for (const document of documents) {
    const publication = asEligiblePublication(document)
    if (!publication) continue

    const key = groupKey(publication)
    let group = groups.get(key)

    if (!group) {
      group = {
        identity: {
          businessType: publication.businessType,
          metric: publication.metric,
          dimension: publication.dimension,
          dimensionValue: publication.dimensionValue,
          operator: publication.operator
        },
        contributors: new Map()
      }
      groups.set(key, group)
    }

    const current = group.contributors.get(publication.contributorId)
    if (!current || publication.publishedAtMs > current.publishedAtMs) {
      group.contributors.set(publication.contributorId, {
        metricValue: publication.metricValue,
        publishedAtMs: publication.publishedAtMs
      })
    }
  }

  const benchmarks: Benchmark[] = []

  for (const group of groups.values()) {
    const contributorCount = group.contributors.size
    if (contributorCount < MINIMUM_CONTRIBUTORS) continue

    const aggregateValue = [...group.contributors.values()]
      .reduce(
        (mean, contributor) => mean + contributor.metricValue / contributorCount,
        0
      )
    if (!Number.isFinite(aggregateValue)) continue

    benchmarks.push(benchmarkSchema.parse({
      ...group.identity,
      aggregateValue,
      contributorCount
    }))
  }

  return benchmarks.sort((a, b) =>
    a.businessType.localeCompare(b.businessType)
    || a.metric.localeCompare(b.metric)
    || a.dimensionValue.localeCompare(b.dimensionValue)
    || a.operator.localeCompare(b.operator)
  )
})
