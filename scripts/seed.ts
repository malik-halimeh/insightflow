import { pathToFileURL } from 'node:url'
import { ObjectId } from 'mongodb'
import {
  closeMongoClient,
  datasetVersionRowsCollection,
  datasetVersionsCollection,
  datasetsCollection,
  publishedInsightsCollection,
  recommendationsCollection,
  salesRowsCollection,
  usersCollection,
  type DatasetDoc,
  type PublishedInsightDoc,
  type SalesRowDoc,
  type UserDoc
} from '../server/utils/db'
import { hashPassword } from '../server/utils/password'
import { writeVersion } from '../server/utils/versioning'
import {
  datasetSchema,
  publishedInsightSchema,
  salesRowSchema,
  userSchema
} from '../shared/schemas'

// Nitro loads .env by itself; a standalone script does not. A missing file is not
// an error: on a deployed machine the variables come from the environment instead,
// and readConfig() reports clearly if they are absent altogether.
try {
  process.loadEnvFile()
} catch {
  // No .env present; fall back to whatever is already in the environment.
}

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
  docs: SalesRowDoc[]
  periodStart: string
  periodEnd: string
}

export function buildSalesRows(datasetId: string): BuiltRows {
  const lastDay = yesterdayUtc()
  const firstDay = addDays(lastDay, -(DAYS - 1))
  const docs: SalesRowDoc[] = []

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
export function describePatterns(docs: SalesRowDoc[]): {
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

function buildPublishedInsights(
  now: string,
  datasetId: string,
  slugSuffix?: string
): PublishedInsightDoc[] {
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
      // These demo insights were written by hand rather than published from a
      // finding, so there is no recommendation to point at. The data set is real,
      // so deleting it still takes these down with it.
      recommendationId: null,
      datasetId,
      publishedAt: now,
      ...draft,
      slug: slugSuffix ? `${draft.slug}-${slugSuffix}` : draft.slug
    }

    const parsed = publishedInsightSchema.safeParse(insight)
    if (!parsed.success) {
      throw new Error(`Generated an invalid insight: ${parsed.error.issues[0]?.message}`)
    }

    const { id, ...rest } = parsed.data
    return { _id: new ObjectId(id), ...rest }
  })
}

/**
 * Refuses to wipe the database unless a human agrees to it.
 *
 * The team shares one Atlas database, so `npm run seed` deletes everyone's work,
 * not just the runner's. It has already happened once. The script now lists what
 * will go and asks for the database name back, which is slow enough to think
 * about and impossible to do by muscle memory.
 *
 * Pass --force to skip the prompt. That is for a machine with no keyboard, and
 * anyone typing it has chosen to accept the consequences.
 */
async function confirmWipe(counts: Record<string, number>): Promise<void> {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const database = process.env.MONGODB_DB ?? 'unknown'

  if (total === 0) return
  if (process.argv.includes('--force')) return

  console.log('')
  console.log(`  This deletes everything below from the "${database}" database.`)
  console.log('  Everyone on the project shares it.')
  console.log('')
  for (const [name, count] of Object.entries(counts)) {
    if (count > 0) console.log(`    ${name.padEnd(20)} ${count}`)
  }
  console.log('')

  if (!process.stdin.isTTY) {
    console.error(`  Refusing to wipe ${total} records without a confirmation.`)
    console.error('  Run it again from a terminal, or pass --force if you are certain.')
    process.exit(1)
  }

  const { createInterface } = await import('node:readline/promises')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`  Type the database name to continue: `)
  rl.close()

  if (answer.trim() !== database) {
    console.log('  Nothing was deleted.')
    process.exit(0)
  }
}

/**
 * The accounts the team signs in with. Passwords are hashed here exactly as the
 * register endpoint hashes them, so a seeded account and a self-registered one
 * are indistinguishable to sign-in.
 *
 * One shared password for every seeded account, overridable with SEED_PASSWORD.
 * These are demo credentials for a shared development database and they are
 * printed at the end of the run — never seed an account whose password should
 * stay secret, and never point this script at anything holding real data.
 *
 * The admin exists only because it is seeded. There is no public endpoint that
 * can create one, which is the whole reason the sign-up form cannot be used to
 * grant administrative access.
 */
/**
 * The five of us. Each member gets one account per role, so anybody can see both
 * sides of the product without borrowing someone else's login: sign in as
 * `<name>-admin` to review sign-ups, or `<name>-owner` to use the workspace.
 *
 * The business attached to each owner account is invented. It exists so the
 * admin dashboard has something to show in every column.
 */
const TEAM = [
  { slug: 'malik', name: 'Malik', business: 'Malik Coffee House', size: 'small', location: 'Beirut, Lebanon', phone: '+961 1 555 101', customers: 1200 },
  { slug: 'sumayya', name: 'Sumayya', business: 'Sumayya Bakery', size: 'small', location: 'Tripoli, Lebanon', phone: '+961 6 555 102', customers: 900 },
  { slug: 'yasser', name: 'Yasser', business: 'Yasser Electronics', size: 'medium', location: 'Sidon, Lebanon', phone: '+961 7 555 103', customers: 450 },
  { slug: 'dalaa', name: 'Dalaa', business: 'Dalaa Flowers', size: 'small', location: 'Byblos, Lebanon', phone: '+961 9 555 104', customers: 600 },
  { slug: 'mohammad', name: 'Mohammad', business: 'Mohammad Sports', size: 'medium', location: 'Zahle, Lebanon', phone: '+961 8 555 105', customers: 750 }
]

/**
 * Every account this script creates, each with its own password so one can be
 * forwarded to one person without handing over everybody else's login.
 *
 * All of these are development credentials for a shared database, and the script
 * prints them when it finishes. Never reuse one anywhere real.
 */
export function seedAccounts(): { password: string, account: Record<string, unknown> }[] {
  const demoPassword = process.env.SEED_PASSWORD || 'insightflow123'

  const team = TEAM.flatMap(member => [
    {
      password: `${member.slug}-admin-2026`,
      account: {
        username: `${member.slug}-admin`,
        email: `${member.slug}-admin@insightflow.local`,
        displayName: `${member.name} (admin)`,
        role: 'admin',
        status: 'approved'
      }
    },
    {
      password: `${member.slug}-owner-2026`,
      account: {
        username: `${member.slug}-owner`,
        email: `${member.slug}@insightflow.local`,
        displayName: member.business,
        role: 'business_owner',
        status: 'approved',
        businessSize: member.size,
        phone: member.phone,
        location: member.location,
        estimatedCustomersPerMonth: member.customers
      }
    }
  ])

  return [...demoAccounts(demoPassword), ...team]
}

function demoAccounts(password: string): { password: string, account: Record<string, unknown> }[] {
  return [
    {
      username: 'admin',
      email: 'admin@insightflow.local',
      displayName: 'InsightFlow Admin',
      role: 'admin',
      status: 'approved'
    },
    {
      // The owner of the demo data set below, so signing in as this account shows
      // a dashboard with eight weeks of sales rather than an empty state.
      username: (process.env.AUTH_USERNAME || 'owner').toLowerCase(),
      email: 'owner@bellapizza.example',
      displayName: 'Bella Pizza',
      role: 'business_owner',
      status: 'approved',
      businessSize: 'small',
      phone: '+44 20 7946 0100',
      location: 'London, United Kingdom',
      estimatedCustomersPerMonth: 1800
    },
    // Two accounts left pending so /admin opens with a queue to work through
    // rather than an empty state that cannot be told apart from a broken page.
    {
      username: 'thegreenkettle',
      email: 'hello@greenkettle.example',
      displayName: 'The Green Kettle',
      role: 'business_owner',
      status: 'pending',
      businessSize: 'small',
      phone: '+44 161 496 0200',
      location: 'Manchester, United Kingdom',
      estimatedCustomersPerMonth: 950
    },
    {
      username: 'northroadcycles',
      email: 'shop@northroadcycles.example',
      displayName: 'North Road Cycles',
      role: 'business_owner',
      status: 'pending',
      businessSize: 'medium',
      phone: '+44 131 496 0300',
      location: 'Edinburgh, United Kingdom',
      estimatedCustomersPerMonth: 400
    }
  ].map(account => ({ password, account }))
}

async function buildUsers(now: string): Promise<UserDoc[]> {
  return Promise.all(seedAccounts().map(async ({ password, account }) => {
    const { id, ...rest } = userSchema.parse({
      id: new ObjectId().toHexString(),
      ...account,
      createdAt: now
    })

    return {
      _id: new ObjectId(id),
      ...rest,
      passwordHash: await hashPassword(password)
    } satisfies UserDoc
  }))
}

/**
 * Gives the demo data set an upload history, so the history page has something to
 * show on a fresh checkout rather than an empty state that cannot be told apart
 * from a broken page.
 *
 * Two versions: an earlier, smaller upload and the full one. The second is the
 * current one, which makes restore something a person can actually try — with a
 * single version there is nothing to go back to.
 */
async function seedVersions(datasetId: string, rows: SalesRowDoc[]): Promise<string | null> {
  // The first four weeks, as though the owner had uploaded partway through.
  const dates = [...new Set(rows.map(row => row.date))].sort((a, b) => a.localeCompare(b))
  const earlyCutoff = dates[Math.floor(dates.length / 2)]!
  const early = rows.filter(row => row.date < earlyCutoff)

  await writeVersion(datasetId, early, 0)
  const current = await writeVersion(datasetId, rows, 6)

  return current?.id ?? null
}

async function seed(): Promise<void> {
  const additive = process.argv.includes('--add')
  const now = new Date().toISOString()
  const datasetId = new ObjectId()
  const datasetIdHex = datasetId.toHexString()

  const { docs: salesRowDocs, periodStart, periodEnd } = buildSalesRows(datasetIdHex)

  const userDocs = await buildUsers(now)

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

  const insightDocs = buildPublishedInsights(
    now,
    datasetIdHex,
    additive ? datasetIdHex : undefined
  )

  const [users, datasets, salesRows, insights, recommendations] = await Promise.all([
    usersCollection(),
    datasetsCollection(),
    salesRowsCollection(),
    publishedInsightsCollection(),
    recommendationsCollection()
  ])

  const { id: dsId, ...datasetRest } = dataset

  if (additive) {
    const userWrites = await users.bulkWrite(userDocs.map((user) => {
      const { _id, createdAt, username, ...updates } = user

      return {
        updateOne: {
          filter: { username },
          update: {
            $set: { username, ...updates },
            $setOnInsert: { _id, createdAt }
          },
          upsert: true
        }
      }
    }))

    await datasets.insertOne({ _id: new ObjectId(dsId), ...datasetRest } satisfies DatasetDoc)
    await salesRows.insertMany(salesRowDocs)
    await insights.insertMany(insightDocs)

    const currentVersionId = await seedVersions(datasetIdHex, salesRowDocs)
    await datasets.updateOne({ _id: new ObjectId(dsId) }, { $set: { currentVersionId } })

    console.log('')
    console.log('  Additive seed complete — nothing was deleted')
    console.log('  ──────────────────────────────────────────────')
    console.log(`  Database         ${process.env.MONGODB_DB}`)
    console.log(`  Users added      ${userWrites.upsertedCount}`)
    console.log(`  Users updated    ${userWrites.matchedCount}`)
    console.log(`  Data set added   1  (${dataset.name})`)
    console.log(`  Data set id      ${datasetIdHex}`)
    console.log(`  Sales rows added ${salesRowDocs.length}`)
    console.log(`  Insights added   ${insightDocs.length}`)
    console.log(`  Upload history   2 versions`)
    printSeedDetails(salesRowDocs, periodStart, periodEnd)
    return
  }

  // Everyone on this project shares one database, so this wipe takes the team's
  // work with it, not just yours. Say what is about to disappear and make someone
  // agree to it out loud.
  const [versions, versionRows] = await Promise.all([
    datasetVersionsCollection(),
    datasetVersionRowsCollection()
  ])

  await confirmWipe({
    users: await users.countDocuments(),
    datasets: await datasets.countDocuments(),
    salesRows: await salesRows.countDocuments(),
    publishedInsights: await insights.countDocuments(),
    recommendations: await recommendations.countDocuments(),
    datasetVersions: await versions.countDocuments(),
    datasetVersionRows: await versionRows.countDocuments()
  })

  // Wiping first is what makes a second run replace the demo rather than double it.
  // `rules` is left untouched: rules are configuration, not part of this demo.
  const removed = await Promise.all([
    users.deleteMany({}),
    datasets.deleteMany({}),
    salesRows.deleteMany({}),
    insights.deleteMany({}),
    recommendations.deleteMany({}),
    // Upload history belongs to the data sets being replaced, so it goes with them.
    // Leaving it would offer restore buttons pointing at rows that no longer exist.
    versions.deleteMany({}),
    versionRows.deleteMany({})
  ])
  const removedCount = removed.reduce((sum, result) => sum + result.deletedCount, 0)

  await users.insertMany(userDocs)
  await datasets.insertOne({ _id: new ObjectId(dsId), ...datasetRest } satisfies DatasetDoc)
  await salesRows.insertMany(salesRowDocs)
  await insights.insertMany(insightDocs)

  const currentVersionId = await seedVersions(datasetIdHex, salesRowDocs)
  await datasets.updateOne({ _id: new ObjectId(dsId) }, { $set: { currentVersionId } })

  console.log('')
  console.log('  Seed complete')
  console.log('  ─────────────────────────────────────────────')
  console.log(`  Removed          ${removedCount} existing document(s)`)
  console.log(`  Database         ${process.env.MONGODB_DB}`)
  console.log('')
  console.log(`  Users            ${userDocs.length}`)
  console.log(`  Data sets        1  (${dataset.name})`)
  console.log(`  Sales rows       ${salesRowDocs.length}`)
  console.log(`  Insights         ${insightDocs.length}`)
  console.log(`  Upload history   2 versions`)
  printSeedDetails(salesRowDocs, periodStart, periodEnd)
}

function printSeedDetails(
  salesRowDocs: SalesRowDoc[],
  periodStart: string,
  periodEnd: string
): void {
  const revenue = salesRowDocs.reduce((sum, row) => sum + row.revenue, 0)
  const patterns = describePatterns(salesRowDocs)

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
  console.log('  Sign in with')
  console.log(`    ${'USERNAME'.padEnd(18)} ${'PASSWORD'.padEnd(20)} ROLE`)
  for (const { password, account } of seedAccounts()) {
    const username = String(account.username)
    const label = account.role === 'admin' ? 'admin' : `business owner (${account.status})`
    console.log(`    ${username.padEnd(18)} ${password.padEnd(20)} ${label}`)
  }
  console.log('')
  console.log('  The two pending accounts cannot sign in until an admin approves them at /admin.')
  console.log('')
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
