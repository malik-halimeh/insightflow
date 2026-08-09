import { pathToFileURL } from 'node:url'
import {
  ObjectId,
  type AnyBulkWriteOperation,
  type ClientSession,
  type Collection,
  type Document
} from 'mongodb'
import {
  datasetSchema,
  datasetVersionSchema,
  outcomeSchema,
  publishedInsightSchema,
  recommendationSchema,
  ruleSchema,
  type Dimension,
  type Metric,
  type Outcome,
  type Recommendation,
  type Rule,
  type RuleOperator,
  type SalesRow
} from '../shared/schemas'
import {
  closeMongoClient,
  datasetVersionRowsCollection,
  datasetVersionsCollection,
  datasetsCollection,
  getMongoClient,
  outcomesCollection,
  publishedInsightsCollection,
  recommendationsCollection,
  rulesCollection,
  salesRowsCollection,
  usersCollection
} from '../server/utils/db'
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
  PRESENTATION_DATASET_KEY,
  PRESENTATION_PERIOD_END,
  PRESENTATION_PERIOD_START,
  PRESENTATION_SEED_ID,
  buildPresentationSalesLines,
  presentationObjectId
} from './presentation-data'

try {
  process.loadEnvFile()
} catch {
  // Deployed environments provide variables directly instead of through .env.
}

type PresentationEnvironment = 'development' | 'staging'

interface SeedOptions {
  database: string
  environment: PresentationEnvironment
  username: string
}

interface PresentationMetadata {
  presentationSeedId: typeof PRESENTATION_SEED_ID
  presentationEntityKey: string
}

type PresentationDocument = Document & PresentationMetadata & { _id: ObjectId }

interface CollectionPlan {
  collection: Collection<Document>
  documents: PresentationDocument[]
  name: string
}

interface WriteSummary {
  matched: number
  modified: number
  name: string
  upserted: number
}

interface PresentationPlan {
  collections: Omit<CollectionPlan, 'collection'>[]
  outcomeStates: string[]
  targetDatasetId: string
}

const metrics: Metric[] = ['revenue', 'quantity', 'orders']
const comparisonDimensions: Dimension[] = ['dayOfWeek', 'item', 'category']
const comparisonOperators: RuleOperator[] = ['above_average_by', 'below_average_by']
const unsoldDimensions: Dimension[] = ['item', 'category']

function argument(name: string): string | undefined {
  const exactIndex = process.argv.indexOf(`--${name}`)
  if (exactIndex >= 0) return process.argv[exactIndex + 1]

  const prefix = `--${name}=`
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length)
}

export function readSeedOptions(): SeedOptions {
  const environment = argument('environment') ?? process.env.PRESENTATION_SEED_ENV
  const database = process.env.MONGODB_DB
  const confirmedDatabase = argument('confirm-database')
    ?? process.env.PRESENTATION_SEED_CONFIRM_DATABASE
  const username = (
    argument('username')
    ?? process.env.PRESENTATION_SEED_USERNAME
    ?? process.env.AUTH_USERNAME
    ?? 'owner'
  ).toLowerCase()

  if (environment !== 'development' && environment !== 'staging') {
    throw new Error(
      'Refusing to seed: pass --environment=development or --environment=staging. Production is never accepted.'
    )
  }

  if (!database) {
    throw new Error('Refusing to seed: MONGODB_DB is not set, so the target database cannot be verified.')
  }

  if (/prod(?:uction)?|live/i.test(database)) {
    throw new Error(`Refusing to seed production-like database "${database}".`)
  }

  if (confirmedDatabase !== database) {
    throw new Error(
      `Refusing to seed: pass --confirm-database=${database} so the exact non-production target is explicit.`
    )
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Refusing to seed: MONGODB_URI is not set.')
  }

  return { database, environment, username }
}

function tagged<T extends Document & { _id: ObjectId }>(
  document: T,
  entityKey: string
): T & PresentationMetadata {
  return {
    ...document,
    presentationSeedId: PRESENTATION_SEED_ID,
    presentationEntityKey: entityKey
  }
}

function asDocument<T extends Document>(value: T): Document {
  return value
}

function titleCase(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .trim()
    .replace(/^./, first => first.toUpperCase())
}

function ruleAdvice(operator: RuleOperator): string {
  if (operator === 'above_average_by') {
    return 'Protect this strength and test one small change that could extend it to another day or product.'
  }

  if (operator === 'below_average_by') {
    return 'Run a focused two-week test, then compare the same measure before and after the change.'
  }

  return 'Review whether this should return, be replaced, or be removed from the offer altogether.'
}

function buildRules(ownerId: string): { key: string, record: Rule }[] {
  const configurations: { metric: Metric, dimension: Dimension, operator: RuleOperator }[] = []

  for (const metric of metrics) {
    for (const dimension of comparisonDimensions) {
      for (const operator of comparisonOperators) {
        configurations.push({ metric, dimension, operator })
      }
    }
  }

  for (const metric of metrics) {
    for (const dimension of unsoldDimensions) {
      configurations.push({ metric, dimension, operator: 'unsold_for_days' })
    }
  }

  if (configurations.length !== 24) {
    throw new Error(`Expected 24 presentation rule configurations, built ${configurations.length}.`)
  }

  return configurations.map(({ metric, dimension, operator }) => {
    const key = `rule:${metric}:${dimension}:${operator}`
    const record = ruleSchema.parse({
      id: presentationObjectId('rule', key),
      ownerId,
      name: `${titleCase(metric)} · ${titleCase(dimension)} · ${titleCase(operator)}`,
      metric,
      dimension,
      operator,
      threshold: operator === 'unsold_for_days' ? 14 : 5,
      advice: ruleAdvice(operator),
      expectedDirection: 'up',
      enabled: true
    })

    return { key, record }
  })
}

function strongestFinding(rows: SalesRow[], rule: Rule) {
  const findings = evaluateRule(rows, rule)
    .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))

  const finding = findings[0]
  if (!finding) {
    throw new Error(`Presentation rule "${rule.name}" produced no finding.`)
  }

  return finding
}

function buildRecommendations(
  rows: SalesRow[],
  rules: { key: string, record: Rule }[]
): { key: string, record: Recommendation }[] {
  const matrix = rules.map(({ key: ruleKey, record: rule }) => {
    const finding = strongestFinding(rows, rule)
    const key = `recommendation:matrix:${ruleKey}`

    return {
      key,
      record: recommendationSchema.parse({
        id: presentationObjectId('recommendation', key),
        datasetId: PRESENTATION_DATASET_ID,
        ruleId: rule.id,
        ...finding,
        createdAt: PRESENTATION_CREATED_AT
      })
    }
  })

  const itemRule = rules.find(({ key }) => key === 'rule:quantity:item:below_average_by')
  if (!itemRule) throw new Error('The presentation item rule was not built.')

  const stories = [
    {
      key: 'recommendation:story:margherita-placement',
      title: 'Margherita Pizza needs a clearer menu position',
      body: 'Margherita is a dependable seller, but its recent position leaves room for a focused placement test.',
      action: 'Move Margherita into the first menu position for two weeks and compare quantity sold.',
      dimensionValue: 'Margherita Pizza',
      changePercent: -12
    },
    {
      key: 'recommendation:story:beetroot-decision',
      title: 'Beetroot & Feta Salad needs a keep-or-drop decision',
      body: 'The salad is selling well below the typical item and is using menu space without dependable demand.',
      action: 'Feature it once for two weeks; if demand does not recover, replace it with a stronger side.',
      dimensionValue: 'Beetroot & Feta Salad',
      changePercent: -68
    },
    {
      key: 'recommendation:story:lasagne-copy',
      title: 'Lasagne is ready for a description test',
      body: 'Lasagne is stable enough for a small copy change whose effect can be measured without changing price.',
      action: 'Rewrite the menu description for two weeks and compare quantity against the previous fortnight.',
      dimensionValue: 'Lasagne',
      changePercent: -8
    },
    {
      key: 'recommendation:story:lunch-slice-launch',
      title: 'Lunch Slice can create a new weekday occasion',
      body: 'There was no Lunch Slice baseline before the new lunch offer, making raw before-and-after units essential.',
      action: 'Keep the lunch offer visible through the next fortnight and measure units rather than percentage growth.',
      dimensionValue: 'Lunch Slice',
      changePercent: -100
    },
    {
      key: 'recommendation:story:garlic-bread-bundle',
      title: 'Garlic Bread is ready for a bundle test',
      body: 'Garlic Bread has enough regular volume to test whether a simple main-and-side bundle lifts demand.',
      action: 'Bundle Garlic Bread with one main for two weeks, then review the measured outcome.',
      dimensionValue: 'Garlic Bread',
      changePercent: -9
    }
  ].map(story => ({
    key: story.key,
    record: recommendationSchema.parse({
      id: presentationObjectId('recommendation', story.key),
      datasetId: PRESENTATION_DATASET_ID,
      ruleId: itemRule.record.id,
      title: story.title,
      body: story.body,
      action: story.action,
      metric: 'quantity',
      dimension: 'item',
      dimensionValue: story.dimensionValue,
      operator: 'below_average_by',
      expectedDirection: 'up',
      changePercent: story.changePercent,
      severity: 'warning',
      createdAt: PRESENTATION_CREATED_AT
    })
  }))

  return [...matrix, ...stories]
}

function buildOutcome(
  rows: SalesRow[],
  recommendation: Recommendation,
  key: string,
  followedDate: string,
  currentVersionId: string,
  pending: boolean,
  note: string | null
): Outcome {
  if (!recommendation.dimensionValue || !recommendation.operator || !recommendation.expectedDirection) {
    throw new Error(`Recommendation "${recommendation.title}" cannot be measured.`)
  }

  const scope: OutcomeMeasurementScope = {
    metric: recommendation.metric,
    dimension: recommendation.dimension,
    dimensionValue: recommendation.dimensionValue
  }
  const windows = outcomeWindows(followedDate)
  const before = measureOutcomeWindow(rows, windows.before, scope, currentVersionId)
  const after = pending
    ? null
    : measureOutcomeWindow(rows, windows.after, scope, currentVersionId)
  const verdict = after
    ? calculateOutcomeVerdict(before.value, after.value, recommendation.expectedDirection)
    : null

  return outcomeSchema.parse({
    id: presentationObjectId('outcome', key),
    recommendationId: recommendation.id,
    datasetId: PRESENTATION_DATASET_ID,
    followedDate,
    note,
    windowDays: 14,
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
    afterWindow: after?.window ?? null,
    afterValue: after?.value ?? null,
    changePercent: verdict?.changePercent ?? null,
    hasMissingSalesDates: after ? after.window.missingSalesDates > 0 : false,
    status: verdict?.status ?? 'pending',
    completedAt: after ? PRESENTATION_CREATED_AT : null,
    createdAt: PRESENTATION_CREATED_AT,
    updatedAt: PRESENTATION_CREATED_AT
  })
}

function buildOutcomes(
  rows: SalesRow[],
  recommendations: { key: string, record: Recommendation }[],
  currentVersionId: string
): { key: string, record: Outcome }[] {
  const byKey = new Map(recommendations.map(entry => [entry.key, entry.record]))

  const definitions = [
    {
      key: 'outcome:margherita-improved',
      recommendationKey: 'recommendation:story:margherita-placement',
      followedDate: '2026-07-25',
      pending: false,
      note: 'Moved Margherita to the first menu position and kept the price unchanged.'
    },
    {
      key: 'outcome:beetroot-worsened',
      recommendationKey: 'recommendation:story:beetroot-decision',
      followedDate: '2026-07-25',
      pending: false,
      note: 'Featured the salad for two weeks before making the final keep-or-drop decision.'
    },
    {
      key: 'outcome:lasagne-no-clear-effect',
      recommendationKey: 'recommendation:story:lasagne-copy',
      followedDate: '2026-07-10',
      pending: false,
      note: 'Changed only the menu description so the result stayed easy to interpret.'
    },
    {
      key: 'outcome:lunch-slice-zero-baseline',
      recommendationKey: 'recommendation:story:lunch-slice-launch',
      followedDate: '2026-07-25',
      pending: false,
      note: 'Introduced Lunch Slice as a new weekday offer with no earlier sales baseline.'
    },
    {
      key: 'outcome:garlic-bread-pending',
      recommendationKey: 'recommendation:story:garlic-bread-bundle',
      followedDate: '2026-08-02',
      pending: true,
      note: 'Started the bundle recently; the full after period is not available yet.'
    }
  ]

  const outcomes = definitions.map((definition) => {
    const recommendation = byKey.get(definition.recommendationKey)
    if (!recommendation) throw new Error(`Missing ${definition.recommendationKey}.`)

    return {
      key: definition.key,
      record: buildOutcome(
        rows,
        recommendation,
        definition.key,
        definition.followedDate,
        currentVersionId,
        definition.pending,
        definition.note
      )
    }
  })

  const states = new Set(outcomes.map(({ record }) => record.status))
  for (const required of ['pending', 'improved', 'no_clear_effect', 'worsened']) {
    if (!states.has(required as Outcome['status'])) {
      throw new Error(`Presentation outcomes do not cover ${required}.`)
    }
  }

  return outcomes
}

function buildInsights(
  ownerId: string,
  recommendations: { key: string, record: Recommendation }[],
  outcomes: { key: string, record: Outcome }[]
): PresentationDocument[] {
  const recommendationByKey = new Map(recommendations.map(entry => [entry.key, entry.record]))
  const outcomeByKey = new Map(outcomes.map(entry => [entry.key, entry.record]))
  const weekday = recommendations.find(({ record }) => (
    record.metric === 'revenue'
    && record.dimension === 'dayOfWeek'
    && record.operator === 'above_average_by'
  ))?.record
  const margherita = recommendationByKey.get('recommendation:story:margherita-placement')
  const beetroot = recommendationByKey.get('recommendation:story:beetroot-decision')
  const margheritaOutcome = outcomeByKey.get('outcome:margherita-improved')
  const beetrootOutcome = outcomeByKey.get('outcome:beetroot-worsened')

  if (!weekday || !margherita || !beetroot || !margheritaOutcome || !beetrootOutcome) {
    throw new Error('Presentation insight sources are incomplete.')
  }

  const definitions = [
    {
      key: 'insight:margherita-growth',
      slug: 'bella-pizza-margherita-placement-test',
      caption: 'A simple menu placement change was followed by stronger Margherita sales in the next fortnight.',
      metricLabel: 'Quantity change after the placement test',
      metricValue: margheritaOutcome.changePercent ?? 0,
      recommendation: margherita,
      publishedAt: '2026-08-09T08:45:00.000Z'
    },
    {
      key: 'insight:weekday-strength',
      slug: 'bella-pizza-weekday-revenue-pattern',
      caption: `${weekday.dimensionValue} consistently contributes more revenue than the average day in this sales period.`,
      metricLabel: `${weekday.dimensionValue} revenue against the weekday average`,
      metricValue: weekday.changePercent,
      recommendation: weekday,
      publishedAt: '2026-08-09T08:20:00.000Z'
    },
    {
      key: 'insight:beetroot-decision',
      slug: 'bella-pizza-beetroot-salad-test',
      caption: 'A featured-menu test did not recover Beetroot Salad demand, giving the team a clear replacement decision.',
      metricLabel: 'Quantity change during the featured-menu test',
      metricValue: beetrootOutcome.changePercent ?? 0,
      recommendation: beetroot,
      publishedAt: '2026-08-09T07:55:00.000Z'
    }
  ]

  return definitions.map((definition) => {
    const id = presentationObjectId('published-insight', definition.key)
    const parsed = publishedInsightSchema.parse({
      id,
      slug: definition.slug,
      displayName: 'Bella Pizza',
      caption: definition.caption,
      metricLabel: definition.metricLabel,
      metricValue: definition.metricValue,
      metric: definition.recommendation.metric,
      dimension: definition.recommendation.dimension,
      dimensionValue: definition.recommendation.dimensionValue ?? null,
      operator: definition.recommendation.operator ?? null,
      hideAbsoluteNumbers: true,
      businessType: 'restaurant',
      recommendationId: definition.recommendation.id,
      datasetId: PRESENTATION_DATASET_ID,
      publishedAt: definition.publishedAt
    })
    const { id: parsedId, ...record } = parsed

    return tagged({
      _id: new ObjectId(parsedId),
      ...record,
      contributorId: ownerId
    }, definition.key)
  })
}

export function buildPresentationPlan(ownerId: string): PresentationPlan {
  const lines = buildPresentationSalesLines()
  const rows = lines.map(line => line.row)
  const currentVersionId = presentationObjectId('dataset-version', 'dataset-version:2:current')
  const earlyVersionId = presentationObjectId('dataset-version', 'dataset-version:1:early')
  const rules = buildRules(ownerId)
  const recommendations = buildRecommendations(rows, rules)
  const outcomes = buildOutcomes(rows, recommendations, currentVersionId)

  const salesDocuments = lines.map(({ entityKey, row }) => {
    const { id, ...record } = row
    return tagged({ _id: new ObjectId(id), ...record }, entityKey)
  })

  const tradingDates = [...new Set(rows.map(row => row.date))].sort((a, b) => a.localeCompare(b))
  const earlyDates = new Set(tradingDates.slice(0, Math.floor(tradingDates.length / 2)))
  const earlyLines = lines.filter(({ row }) => earlyDates.has(row.date))
  const earlyRows = earlyLines.map(line => line.row)

  const datasetRecord = datasetSchema.parse({
    id: PRESENTATION_DATASET_ID,
    ownerId,
    name: 'Bella Pizza · presentation workspace',
    businessType: 'restaurant',
    periodStart: PRESENTATION_PERIOD_START,
    periodEnd: PRESENTATION_PERIOD_END,
    rowCount: rows.length,
    currentVersionId,
    notes: `Synthetic presentation data owned by ${PRESENTATION_SEED_ID}.`,
    createdAt: PRESENTATION_CREATED_AT,
    updatedAt: PRESENTATION_CREATED_AT
  })
  const { id: datasetId, ...dataset } = datasetRecord

  function versionDocument(
    id: string,
    key: string,
    versionRows: SalesRow[],
    versionNumber: number,
    rejectedCount: number,
    createdAt: string
  ) {
    const dates = versionRows.map(row => row.date).sort((a, b) => a.localeCompare(b))
    const parsed = datasetVersionSchema.parse({
      id,
      datasetId: PRESENTATION_DATASET_ID,
      versionNumber,
      rowCount: versionRows.length,
      rejectedCount,
      periodStart: dates[0],
      periodEnd: dates.at(-1),
      quality: assessQuality(versionRows),
      createdAt
    })
    const { id: parsedId, ...record } = parsed
    return tagged({ _id: new ObjectId(parsedId), ...record }, key)
  }

  const versionDocuments = [
    versionDocument(
      earlyVersionId,
      'dataset-version:1:early',
      earlyRows,
      1,
      0,
      '2026-07-01T09:00:00.000Z'
    ),
    versionDocument(
      currentVersionId,
      'dataset-version:2:current',
      rows,
      2,
      4,
      PRESENTATION_CREATED_AT
    )
  ]

  const versionRowDocuments = [
    ...earlyLines.map(({ entityKey, row }) => {
      const { id: _rowId, ...record } = row
      const key = `dataset-version-row:1:${entityKey}`
      return tagged({
        _id: new ObjectId(presentationObjectId('dataset-version-row', key)),
        ...record,
        versionId: earlyVersionId
      }, key)
    }),
    ...lines.map(({ entityKey, row }) => {
      const { id: _rowId, ...record } = row
      const key = `dataset-version-row:2:${entityKey}`
      return tagged({
        _id: new ObjectId(presentationObjectId('dataset-version-row', key)),
        ...record,
        versionId: currentVersionId
      }, key)
    })
  ]

  const ruleDocuments = rules.map(({ key, record }) => {
    const { id, ...rule } = record
    return tagged({ _id: new ObjectId(id), ...rule }, key)
  })
  const recommendationDocuments = recommendations.map(({ key, record }) => {
    const { id, ...recommendation } = record
    return tagged({ _id: new ObjectId(id), ...recommendation }, key)
  })
  const outcomeDocuments = outcomes.map(({ key, record }) => {
    const { id, ...outcome } = record
    return tagged({ _id: new ObjectId(id), ...outcome }, key)
  })
  const insightDocuments = buildInsights(ownerId, recommendations, outcomes)

  return {
    targetDatasetId: datasetId,
    outcomeStates: outcomes.map(({ record }) => record.status),
    collections: [
      { name: 'datasets', documents: [tagged({ _id: new ObjectId(datasetId), ...dataset }, PRESENTATION_DATASET_KEY)] },
      { name: 'salesRows', documents: salesDocuments },
      { name: 'rules', documents: ruleDocuments },
      { name: 'recommendations', documents: recommendationDocuments },
      { name: 'publishedInsights', documents: insightDocuments },
      { name: 'outcomes', documents: outcomeDocuments },
      { name: 'datasetVersions', documents: versionDocuments },
      { name: 'datasetVersionRows', documents: versionRowDocuments }
    ]
  }
}

async function countManualDocuments(plan: CollectionPlan[], session: ClientSession) {
  return Object.fromEntries(await Promise.all(plan.map(async ({ collection, name }) => [
    name,
    await collection.countDocuments(
      { presentationSeedId: { $ne: PRESENTATION_SEED_ID } },
      { session }
    )
  ])))
}

async function assertOwnedIds(plan: CollectionPlan[], session: ClientSession): Promise<void> {
  for (const { collection, documents, name } of plan) {
    const collision = await collection.findOne({
      _id: { $in: documents.map(document => document._id) },
      presentationSeedId: { $ne: PRESENTATION_SEED_ID }
    }, { session })

    if (collision) {
      throw new Error(
        `Refusing to overwrite non-presentation document ${String(collision._id)} in ${name}.`
      )
    }
  }
}

async function assertInsightSlugs(plan: CollectionPlan[], session: ClientSession): Promise<void> {
  const insights = plan.find(entry => entry.name === 'publishedInsights')
  if (!insights) throw new Error('The published-insights collection plan is missing.')

  const slugs = insights.documents.map(document => String(document.slug))
  const ids = insights.documents.map(document => document._id)
  const collision = await insights.collection.findOne({
    slug: { $in: slugs },
    _id: { $nin: ids }
  }, { session })

  if (collision) {
    throw new Error(`Refusing to reuse public insight slug "${String(collision.slug)}".`)
  }
}

async function replaceSeedDocuments(
  { collection, documents, name }: CollectionPlan,
  session: ClientSession
): Promise<WriteSummary> {
  const operations: AnyBulkWriteOperation<Document>[] = documents.map(document => ({
    replaceOne: {
      filter: { _id: document._id },
      replacement: document,
      upsert: true
    }
  }))
  const result = await collection.bulkWrite(operations, { ordered: true, session })

  return {
    name,
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount
  }
}

async function collectionsFor(plan: PresentationPlan): Promise<CollectionPlan[]> {
  const collections = await Promise.all([
    datasetsCollection(),
    salesRowsCollection(),
    rulesCollection(),
    recommendationsCollection(),
    publishedInsightsCollection(),
    outcomesCollection(),
    datasetVersionsCollection(),
    datasetVersionRowsCollection()
  ])

  return plan.collections.map((entry, index) => ({
    ...entry,
    collection: collections[index] as unknown as Collection<Document>,
    documents: entry.documents.map(asDocument) as PresentationDocument[]
  }))
}

export async function seedPresentation(): Promise<void> {
  const options = readSeedOptions()
  const users = await usersCollection()
  const owner = await users.findOne({ username: options.username })

  if (!owner || owner.role !== 'business_owner' || owner.status !== 'approved') {
    throw new Error(
      `Refusing to seed: "${options.username}" is not an existing approved business-owner account.`
    )
  }

  const plan = buildPresentationPlan(owner._id.toHexString())
  const collectionPlan = await collectionsFor(plan)
  const client = await getMongoClient()
  const session = client.startSession()
  let summaries: WriteSummary[] = []
  let manualCounts: Record<string, number> = {}

  try {
    await session.withTransaction(async () => {
      await assertOwnedIds(collectionPlan, session)
      await assertInsightSlugs(collectionPlan, session)
      const before = await countManualDocuments(collectionPlan, session)
      const attempt: WriteSummary[] = []

      for (const entry of collectionPlan) {
        attempt.push(await replaceSeedDocuments(entry, session))
      }

      const after = await countManualDocuments(collectionPlan, session)
      for (const name of Object.keys(before)) {
        if (before[name] !== after[name]) {
          throw new Error(`Manual document count changed in ${name}; aborting the presentation seed.`)
        }
      }

      manualCounts = after
      summaries = attempt
    })
  } finally {
    await session.endSession()
  }

  const totals = summaries.reduce((result, summary) => ({
    matched: result.matched + summary.matched,
    modified: result.modified + summary.modified,
    upserted: result.upserted + summary.upserted
  }), { matched: 0, modified: 0, upserted: 0 })

  console.log('')
  console.log('Presentation seed complete')
  console.log(`Environment: ${options.environment}`)
  console.log(`Database: ${options.database}`)
  console.log(`Owner: ${options.username} (${owner._id.toHexString()})`)
  console.log(`Seed id: ${PRESENTATION_SEED_ID}`)
  console.log(`Data set: ${plan.targetDatasetId}`)
  console.log('')
  for (const summary of summaries) {
    console.log(
      `${summary.name.padEnd(22)} matched ${String(summary.matched).padStart(4)}  modified ${String(summary.modified).padStart(4)}  upserted ${String(summary.upserted).padStart(4)}`
    )
  }
  console.log('')
  console.log(`Totals: matched ${totals.matched}, modified ${totals.modified}, upserted ${totals.upserted}`)
  console.log(`Manual documents preserved: ${Object.values(manualCounts).reduce((sum, count) => sum + count, 0)}`)
  console.log('Deleted: 0 (this command has no delete path)')
  console.log(`Outcome states: ${plan.outcomeStates.join(', ')}`)
}

const runDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (runDirectly) {
  seedPresentation()
    .catch((error: unknown) => {
      console.error(`Presentation seed failed: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    })
    .finally(closeMongoClient)
}
