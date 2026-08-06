import { pathToFileURL } from 'node:url'
// Type-only imports are erased at compile time (they produce no runtime
// `require`/`import`), so they're safe to keep as static imports — only the
// value imports below need to be dynamic to preserve load order (see note above them).
import type {
  DatasetDocument,
  PublishedInsightDocument,
  RecommendationDocument,
  RuleDocument,
  SalesRowDocument,
  UserDocument
} from '../server/utils/db'

// Nitro loads .env by itself; a standalone script does not. A missing file is not
// an error: on a deployed machine the variables come from the environment instead,
// and readConfig() reports clearly if they are absent altogether.
//
// This MUST run before anything that reads process.env at import time (e.g.
// server/utils/db.ts reads MONGODB_URI at module scope). Static `import`
// statements are hoisted and evaluate before any other code in this file, so
// those imports have to be dynamic and come after loadEnvFile() runs below —
// otherwise db.ts sees an empty MONGODB_URI even when .env has it.
try {
  process.loadEnvFile()
} catch {
  // No .env present; fall back to whatever is already in the environment.
}

const { ObjectId } = await import('mongodb')
const {
  closeMongoClient,
  datasetsCollection,
  publishedInsightsCollection,
  recommendationsCollection,
  rulesCollection,
  salesRowsCollection,
  usersCollection,
} = await import('../server/utils/db')
const { hashPassword } = await import('../server/utils/password')
const {
  datasetSchema,
  publishedInsightSchema,
  recommendationSchema,
  ruleSchema,
  salesRowSchema,
  userSchema
} = await import('../shared/schemas')

const WEEKS = 8
const DAYS = WEEKS * 7

/**
 * Seeded so two runs produce the same numbers. A bug that only shows up on
 * certain data stays reproducible instead of vanishing on the next seed.
 */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = makeRandom(20260315)

/** Symmetric jitter, e.g. spread(0.1) returns a factor between 0.9 and 1.1. */
function spread(amount: number): number {
  return 1 + (random() - 0.5) * 2 * amount
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Indexed by JavaScript's day number, Sunday first. These average to exactly 1.0,
 * so Friday and Saturday sit 30% above the weekly average and Tuesday 20% below —
 * the patterns the recommendation engine is meant to discover.
 */
const DAY_FACTORS = [0.92, 0.85, 0.80, 0.88, 0.95, 1.30, 1.30]

interface MenuItem {
  name: string
  category: string
  unitPrice: number
  /** Average units sold on an average day. */
  baseQuantity: number
}

const MENU: MenuItem[] = [
  { name: 'Margherita Pizza', category: 'Mains', unitPrice: 9.5, baseQuantity: 18 },
  { name: 'Pepperoni Pizza', category: 'Mains', unitPrice: 11, baseQuantity: 15 },
  { name: 'Lasagne', category: 'Mains', unitPrice: 12.5, baseQuantity: 10 },
  { name: 'Grilled Chicken', category: 'Mains', unitPrice: 13, baseQuantity: 8 },

  { name: 'Garlic Bread', category: 'Sides', unitPrice: 4, baseQuantity: 22 },
  // High volume, low price: the thin-margin line the engine should notice.
  { name: 'House Fries', category: 'Sides', unitPrice: 3, baseQuantity: 44 },
  // Priced like a main but barely sells: the item worth dropping from the menu.
  // Tuned so it manages the odd sale on busy nights rather than none at all —
  // an item with no rows would be invisible to the recommendation engine.
  { name: 'Beetroot & Feta Salad', category: 'Sides', unitPrice: 8.5, baseQuantity: 0.45 },

  { name: 'Still Water', category: 'Drinks', unitPrice: 2, baseQuantity: 20 },
  { name: 'Soft Drink', category: 'Drinks', unitPrice: 2.5, baseQuantity: 24 },
  { name: 'House Wine (glass)', category: 'Drinks', unitPrice: 6, baseQuantity: 14 },

  { name: 'Tiramisu', category: 'Desserts', unitPrice: 6.5, baseQuantity: 9 },
  { name: 'Gelato', category: 'Desserts', unitPrice: 4.5, baseQuantity: 7 }
]

/** Midnight UTC yesterday, so the seed never contains a partial day. */
function yesterdayUtc(): Date {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - 1)
  return date
}

function toCalendarDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

interface BuiltRows {
  docs: SalesRowDocument[]
  periodStart: string
  periodEnd: string
}

export function buildSalesRows(datasetId: string): BuiltRows {
  const lastDay = yesterdayUtc()
  const firstDay = addDays(lastDay, -(DAYS - 1))
  const docs: SalesRowDocument[] = []

  for (let offset = 0; offset < DAYS; offset++) {
    const day = addDays(firstDay, offset)
    const date = toCalendarDay(day)
    const dayFactor = DAY_FACTORS[day.getUTCDay()]!

    // One factor for the whole day so a busy day is busy across the whole menu,
    // then per-item jitter on top. Without this the days look interchangeable.
    const trading = dayFactor * spread(0.09)

    for (const item of MENU) {
      const quantity = Math.round(item.baseQuantity * trading * spread(0.16))
      // The schema requires a positive whole number, so a zero-sale day for an
      // item is simply absent rather than stored as a row of nothing.
      if (quantity < 1) continue

      const unitPrice = item.unitPrice
      const row = {
        id: new ObjectId().toHexString(),
        datasetId,
        date,
        itemName: item.name,
        category: item.category,
        quantity,
        unitPrice,
        revenue: round2(quantity * unitPrice)
      }

      // Every row is checked against the shared contract before it is stored, so
      // the seed can never drift away from what the API will accept.
      const parsed = salesRowSchema.safeParse(row)
      if (!parsed.success) {
        throw new Error(`Generated an invalid sales row: ${parsed.error.issues[0]?.message}`)
      }

      const { id, ...rest } = parsed.data
      docs.push({ _id: new ObjectId(id), ...rest })
    }
  }

  return { docs, periodStart: toCalendarDay(firstDay), periodEnd: toCalendarDay(lastDay) }
}

/** Confirms the patterns really are in the generated numbers, not just intended. */
export function describePatterns(docs: SalesRowDocument[]): {
  byWeekday: { label: string, deltaPercent: number }[]
  quietest: string
  busiest: string
} {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const revenueByWeekday = new Array<number>(7).fill(0)
  const daysSeen = new Array<number>(7).fill(0)
  const seenDates = new Set<string>()

  for (const row of docs) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay()
    revenueByWeekday[weekday]! += row.revenue
    if (!seenDates.has(row.date)) {
      seenDates.add(row.date)
      daysSeen[weekday]! += 1
    }
  }

  const dailyAverages = revenueByWeekday.map((total, index) => total / (daysSeen[index] || 1))
  const overall = dailyAverages.reduce((sum, value) => sum + value, 0) / 7

  const byWeekday = dailyAverages.map((average, index) => ({
    label: names[index]!,
    deltaPercent: round2(((average - overall) / overall) * 100)
  }))

  // Start from the full menu so an item that never sold still ranks, rather than
  // dropping out of the report and letting a better seller look like the worst.
  const unitsByItem = new Map<string, number>(MENU.map(item => [item.name, 0]))
  for (const row of docs) {
    unitsByItem.set(row.itemName, (unitsByItem.get(row.itemName) ?? 0) + row.quantity)
  }
  const ranked = [...unitsByItem.entries()].sort((a, b) => b[1] - a[1])

  return {
    byWeekday,
    busiest: `${ranked[0]![0]} (${ranked[0]![1]} sold)`,
    quietest: `${ranked.at(-1)![0]} (${ranked.at(-1)![1]} sold)`
  }
}

function buildPublishedInsights(now: string): PublishedInsightDocument[] {
  const drafts = [
    {
      slug: 'friday-night-is-our-busiest',
      caption: 'Friday and Saturday nights bring in far more than the rest of the week put together.',
      metricLabel: 'Friday revenue against the weekly average',
      metricValue: 30
    },
    {
      slug: 'tuesday-is-our-quietest-night',
      caption: 'Tuesday is reliably our slowest night, which makes it the safest night to try an offer.',
      metricLabel: 'Tuesday revenue against the weekly average',
      metricValue: -20
    },
    {
      slug: 'house-fries-outsell-everything',
      caption: 'Our cheapest side sells more units than any main course on the menu, week after week.',
      metricLabel: 'Units sold against the next best seller',
      metricValue: 2
    }
  ]

  return drafts.map((draft) => {
    const insight = {
      id: new ObjectId().toHexString(),
      displayName: 'Bella Pizza',
      hideAbsoluteNumbers: true,
      businessType: 'restaurant',
      publishedAt: now,
      ...draft
    }

    const parsed = publishedInsightSchema.safeParse(insight)
    if (!parsed.success) {
      throw new Error(`Generated an invalid insight: ${parsed.error.issues[0]?.message}`)
    }

    const { id, ...rest } = parsed.data
    return { _id: new ObjectId(id), ...rest }
  })
}

/** Rules matching the same patterns the generated sales data is tuned to contain. */
function buildRules(): RuleDocument[] {
  const drafts = [
    {
      name: 'Quiet nights',
      metric: 'revenue' as const,
      dimension: 'dayOfWeek' as const,
      operator: 'below_average_by' as const,
      threshold: 15,
      advice: 'Try a set menu on this night and keep one fewer person on.',
      enabled: true
    },
    {
      name: 'Busy nights',
      metric: 'revenue' as const,
      dimension: 'dayOfWeek' as const,
      operator: 'above_average_by' as const,
      threshold: 25,
      advice: 'Order stock the day before so this night never runs short.',
      enabled: true
    },
    {
      name: 'Dead stock',
      metric: 'quantity' as const,
      dimension: 'item' as const,
      operator: 'unsold_for_days' as const,
      threshold: 14,
      advice: 'Drop this item from the menu or replace it with something similar.',
      enabled: true
    },
    {
      name: 'Slow hours',
      metric: 'orders' as const,
      dimension: 'hour' as const,
      operator: 'below_average_by' as const,
      threshold: 40,
      advice: 'Consider opening an hour later on weekdays.',
      enabled: false
    }
  ]

  return drafts.map((draft) => {
    const rule = { id: new ObjectId().toHexString(), ...draft }
    const parsed = ruleSchema.safeParse(rule)
    if (!parsed.success) {
      throw new Error(`Generated an invalid rule: ${parsed.error.issues[0]?.message}`)
    }
    const { id, ...rest } = parsed.data
    return { _id: new ObjectId(id), ...rest }
  })
}

/**
 * Findings that plausibly came from the rules above being run against the
 * generated sales data — so the /recommendations page has something real to
 * show on a fresh database, not an empty state.
 */
function buildRecommendations(datasetId: string, ruleDocs: RuleDocument[], now: string): RecommendationDocument[] {
  const quietRuleId = ruleDocs.find(r => r.name === 'Quiet nights')!._id.toHexString()
  const busyRuleId = ruleDocs.find(r => r.name === 'Busy nights')!._id.toHexString()

  const drafts = [
    {
      ruleId: busyRuleId,
      title: 'Fridays are your busiest night by a wide margin',
      body: 'Friday takings run well above every other night, and Saturday is close behind. Thursday is the last chance to order stock before that rush.',
      action: 'Move your stock order to Thursday morning so Friday never runs short.',
      metric: 'revenue' as const,
      dimension: 'dayOfWeek' as const,
      changePercent: 32.7,
      severity: 'opportunity' as const
    },
    {
      ruleId: quietRuleId,
      title: 'Tuesday is reliably your quietest night',
      body: 'Tuesday takings sit below the weekly average every single week in this period. It is the safest night to try something without risking a busy service.',
      action: 'Try a set menu on Tuesdays for a month, and keep one fewer person on.',
      metric: 'revenue' as const,
      dimension: 'dayOfWeek' as const,
      changePercent: -18.5,
      severity: 'opportunity' as const
    },
    {
      ruleId: null,
      title: 'Beetroot & Feta Salad has almost stopped selling',
      body: 'Fifteen sold in eight weeks, on fifteen separate days. It still takes up space on the menu and stock in the fridge.',
      action: 'Drop it from the menu, or replace it with a side that shares ingredients you already hold.',
      metric: 'quantity' as const,
      dimension: 'item' as const,
      changePercent: -41.2,
      severity: 'warning' as const
    },
    {
      ruleId: null,
      title: 'House Fries outsell every main course',
      body: 'Your cheapest side sells more units than anything else on the menu, week after week. It is doing a lot of work at a low price.',
      action: 'Check the margin on fries before your next price review — a small rise reaches more customers than a rise anywhere else.',
      metric: 'quantity' as const,
      dimension: 'item' as const,
      changePercent: 14.2,
      severity: 'info' as const
    }
  ]

  return drafts.map((draft) => {
    const recommendation = {
      id: new ObjectId().toHexString(),
      datasetId,
      createdAt: now,
      ...draft
    }
    const parsed = recommendationSchema.safeParse(recommendation)
    if (!parsed.success) {
      throw new Error(`Generated an invalid recommendation: ${parsed.error.issues[0]?.message}`)
    }
    const { id, ...rest } = parsed.data
    return { _id: new ObjectId(id), ...rest }
  })
}

interface SeedUserInput {
  username: string
  email: string
  displayName: string
  role: 'business_owner' | 'admin'
  status: 'pending' | 'approved' | 'deactivated' | 'rejected'
  password: string
  businessSize?: 'small' | 'medium' | 'large'
  phone?: string
  location?: string
  estimatedCustomersPerMonth?: number
}

/**
 * Plaintext username/password pairs for every account this run created, kept
 * only in memory so the seed summary at the end can print them once. Never
 * written to the database (only the scrypt hash is stored) and never logged
 * anywhere except this script's own stdout.
 */
const SEED_USER_LOG: { role: string, username: string, password: string, status: string }[] = []

/**
 * Builds every seeded account. One admin (so `/admin` has someone who can sign
 * in) and four business owners spread across every status the workflow
 * supports, so the admin dashboard has something real to demonstrate rather
 * than an empty queue on a fresh database.
 */
// Shared password for the demo accounts that only exist to show off the admin
// approval workflow (pending / deactivated). They cannot sign in until an
// admin approves them, so this does not need to be unique per account — but
// it is still 16 random characters, not a guessable word, in case one gets
// approved later.
const DEMO_ACCOUNT_PASSWORD = 'Demo-8f3kQz2vLp9x'

async function buildUsers(now: string): Promise<UserDocument[]> {
  const seedUsername = (process.env.AUTH_USERNAME || 'owner').toLowerCase()
  const seedPassword = process.env.AUTH_PASSWORD || 'change-me-before-deploying'
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-before-deploying'

  const inputs: SeedUserInput[] = [
    {
      username: adminUsername,
      email: `${adminUsername}@example.com`,
      displayName: 'InsightFlow Admin',
      role: 'admin',
      status: 'approved',
      password: adminPassword
    },
    {
      username: seedUsername,
      email: `${seedUsername}@example.com`,
      displayName: 'Bella Pizza',
      role: 'business_owner',
      status: 'approved',
      password: seedPassword,
      businessSize: 'medium',
      phone: '+1 555 010 1234',
      location: 'Brooklyn, NY',
      estimatedCustomersPerMonth: 1800
    },
    {
      username: 'thecornercafe',
      email: 'owner@thecornercafe.example.com',
      displayName: 'The Corner Café',
      role: 'business_owner',
      status: 'pending',
      password: DEMO_ACCOUNT_PASSWORD,
      businessSize: 'small',
      phone: '+1 555 010 5678',
      location: 'Austin, TX',
      estimatedCustomersPerMonth: 450
    },
    {
      username: 'luigisdeli',
      email: 'owner@luigisdeli.example.com',
      displayName: "Luigi's Deli",
      role: 'business_owner',
      status: 'pending',
      password: DEMO_ACCOUNT_PASSWORD,
      businessSize: 'small',
      phone: '+1 555 010 9012',
      location: 'Chicago, IL',
      estimatedCustomersPerMonth: 620
    },
    {
      username: 'sunsetgym',
      email: 'owner@sunsetgym.example.com',
      displayName: 'Sunset Gym',
      role: 'business_owner',
      status: 'deactivated',
      password: DEMO_ACCOUNT_PASSWORD,
      businessSize: 'large',
      phone: '+1 555 010 3456',
      location: 'San Diego, CA',
      estimatedCustomersPerMonth: 5200
    }
  ]

  SEED_USER_LOG.length = 0
  for (const input of inputs) {
    SEED_USER_LOG.push({
      role: input.role,
      username: input.username,
      password: input.password,
      status: input.status
    })
  }

  return Promise.all(inputs.map(async (input) => {
    const record = userSchema.parse({
      id: new ObjectId().toHexString(),
      username: input.username,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: input.status,
      businessSize: input.businessSize,
      phone: input.phone,
      location: input.location,
      estimatedCustomersPerMonth: input.estimatedCustomersPerMonth,
      createdAt: now
    })
    const { id, ...rest } = record
    const passwordHash = await hashPassword(input.password)
    return { _id: new ObjectId(id), ...rest, passwordHash } satisfies UserDocument
  }))
}

async function seed(): Promise<void> {
  const now = new Date().toISOString()
  const datasetId = new ObjectId()
  const datasetIdHex = datasetId.toHexString()

  const { docs: salesRowDocs, periodStart, periodEnd } = buildSalesRows(datasetIdHex)

  const userDocs = await buildUsers(now)
  // The approved business owner (Bella Pizza) is the one the seeded dataset and
  // insights belong to — it is the only account with data to look at.
  const primaryOwner = userDocs.find(doc => doc.role === 'business_owner' && doc.status === 'approved')!

  const dataset = datasetSchema.parse({
    id: datasetIdHex,
    name: 'Bella Pizza — last 8 weeks',
    businessType: 'restaurant',
    periodStart,
    periodEnd,
    rowCount: salesRowDocs.length,
    currentVersionId: null,
    notes: 'Demo data generated by npm run seed.',
    createdAt: now,
    updatedAt: now
  })

  const insightDocs = buildPublishedInsights(now)
  const ruleDocs = buildRules()
  const recommendationDocs = buildRecommendations(datasetIdHex, ruleDocs, now)

  const [users, datasets, salesRows, insights, recommendations, rules] = await Promise.all([
    usersCollection(),
    datasetsCollection(),
    salesRowsCollection(),
    publishedInsightsCollection(),
    recommendationsCollection(),
    rulesCollection()
  ])

  // Wiping first is what makes a second run replace the demo rather than double it.
  const removed = await Promise.all([
    users.deleteMany({}),
    datasets.deleteMany({}),
    salesRows.deleteMany({}),
    insights.deleteMany({}),
    recommendations.deleteMany({}),
    rules.deleteMany({})
  ])
  const removedCount = removed.reduce((sum, result) => sum + result.deletedCount, 0)

  const { id: dsId, ...datasetRest } = dataset

  await users.insertMany(userDocs)
  await datasets.insertOne(
    { _id: new ObjectId(dsId), ...datasetRest } satisfies DatasetDocument
  )
  await salesRows.insertMany(salesRowDocs)
  await insights.insertMany(insightDocs)
  await rules.insertMany(ruleDocs)
  await recommendations.insertMany(recommendationDocs)

  const revenue = salesRowDocs.reduce((sum, row) => sum + row.revenue, 0)
  const patterns = describePatterns(salesRowDocs)

  const usingDefaultAdminPassword = !process.env.ADMIN_PASSWORD
  const usingDefaultOwnerPassword = !process.env.AUTH_PASSWORD

  console.log('')
  console.log('  Seed complete')
  console.log('  ─────────────────────────────────────────────')
  console.log(`  Removed          ${removedCount} existing document(s)`)
  console.log(`  Database         ${process.env.MONGODB_DB}`)
  console.log('')
  console.log(`  Users            ${userDocs.length}  (1 admin, ${userDocs.length - 1} business owners)`)
  console.log(`  Data set owner   ${primaryOwner.username} (${primaryOwner.status})`)
  console.log(`  Data sets        1  (${dataset.name})`)
  console.log(`  Sales rows       ${salesRowDocs.length}`)
  console.log(`  Insights         ${insightDocs.length}`)
  console.log(`  Rules            ${ruleDocs.length}`)
  console.log(`  Recommendations  ${recommendationDocs.length}`)
  console.log('')
  console.log(`  Period           ${periodStart} to ${periodEnd}  (${WEEKS} weeks)`)
  console.log(`  Menu             ${MENU.length} items across ${new Set(MENU.map(m => m.category)).size} categories`)
  console.log(`  Total revenue    ${round2(revenue).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}`)
  console.log('')
  console.log('  Patterns in the generated data')
  for (const day of patterns.byWeekday) {
    const sign = day.deltaPercent >= 0 ? '+' : ''
    console.log(`    ${day.label.padEnd(10)} ${sign}${day.deltaPercent}% against the daily average`)
  }
  console.log('')
  console.log(`    Best seller     ${patterns.busiest}`)
  console.log(`    Worst seller    ${patterns.quietest}`)
  console.log('')
  console.log('  Sign-in credentials for the accounts just created')
  console.log('  ─────────────────────────────────────────────')
  for (const input of SEED_USER_LOG) {
    console.log(`    ${input.role.padEnd(14)} ${input.username.padEnd(16)} ${input.password}  (${input.status})`)
  }
  console.log('')
  if (usingDefaultAdminPassword || usingDefaultOwnerPassword) {
    console.log('  ⚠  ADMIN_PASSWORD and/or AUTH_PASSWORD were not set in your environment (no')
    console.log('     .env file, or those lines are missing from it), so the literal fallback')
    console.log('     "change-me-before-deploying" was used instead — copy .env.example to .env')
    console.log('     (it already includes strong random values) and re-run `npm run seed`')
    console.log('     before deploying anywhere reachable by anyone else.')
    console.log('')
  }
}

// Only connect when run as a command. Importing this file (to check the generated
// data, for instance) must not open a database connection.
const runDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (runDirectly) {
  seed()
    .catch((error: unknown) => {
      console.error('\n  Seed failed:', error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(closeMongoClient)
}
