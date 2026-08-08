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
  outcomesCollection,
  rulesCollection,
  usersCollection,
  type DatasetDoc,
  type OutcomeDoc,
  type PublishedInsightDoc,
  type RecommendationDoc,
  type RuleDoc,
  type SalesRowDoc,
  type UserDoc
} from '../server/utils/db'
import { hashPassword } from '../server/utils/password'
import { evaluateRule } from '../server/utils/rules'
import { writeVersion } from '../server/utils/versioning'
import {
  OUTCOME_NO_CLEAR_EFFECT_PERCENT,
  OUTCOME_WINDOW_DAYS,
  datasetSchema,
  outcomeSchema,
  publishedInsightSchema,
  ruleSchema,
  salesRowSchema,
  userSchema,
  type SalesRow
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

/**
 * Gives the demo owner a saved rule, the findings that rule really produces, and
 * three outcomes measured from the seeded sales.
 *
 * The findings come from `evaluateRule`, not from hand-written strings. The
 * recommendations route upserts on title, metric and dimension, so a hand-written
 * title that drifted from what the engine produces would leave the seeded outcome
 * pointing at a recommendation nobody can reach, and a duplicate finding beside
 * it. Running the engine here means the seed cannot drift from it.
 *
 * The before and after values are summed from the seeded rows rather than
 * invented, so the verdicts are real: whatever the generated data says happened
 * either side of the follow date is what the outcome records. Every outcome is
 * parsed through `outcomeSchema` before it is written, which means its
 * cross-field rules police this function as well.
 */
export async function seedOutcomes(
  datasetId: string,
  ownerId: string,
  rows: SalesRowDoc[],
  now: string
): Promise<{ rules: RuleDoc[], recommendations: RecommendationDoc[], outcomes: OutcomeDoc[] }> {
  /*
    Two rules, because one is not enough to fill the screen honestly.

    The weekday rule alone produces two findings, and the generated trading is
    stable week to week by construction, so both measure as no clear effect. True,
    and a dull thing to hand M4 as the only state their interface ever renders.
    The item rule adds findings whose fortnight-to-fortnight quantities are small
    and jittery, which produces real movement in both directions without any
    number here being invented.
  */
  const ruleDefinitions = [
    {
      name: 'Quiet days',
      metric: 'revenue',
      dimension: 'dayOfWeek',
      operator: 'below_average_by',
      threshold: 15,
      advice: 'Run an offer on this day, or move a member of staff to a busier shift.',
      expectedDirection: 'up',
      enabled: true
    },
    {
      name: 'Low-selling items',
      metric: 'quantity',
      dimension: 'item',
      operator: 'below_average_by',
      threshold: 70,
      advice: 'Move this to the top of the menu for a fortnight, or take it off.',
      expectedDirection: 'up',
      enabled: true
    }
  ]

  const rules = ruleDefinitions.map(definition => ruleSchema.parse({
    id: new ObjectId().toHexString(),
    ownerId,
    ...definition
  }))

  const ruleDocs: RuleDoc[] = rules.map(({ id, ...rest }) => ({ _id: new ObjectId(id), ...rest }))

  const salesRows: SalesRow[] = rows.map(({ _id, ...row }) => ({ id: _id.toHexString(), ...row }))
  const findings = rules.flatMap(rule =>
    evaluateRule(salesRows, rule).map(finding => ({ finding, ruleId: rule.id }))
  )

  if (findings.length === 0) {
    // The generated data always has a quiet Tuesday and a slow salad, so this
    // means the generator or the engine has changed. Better to say so than to
    // seed nothing quietly.
    throw new Error('The seeded sales produced no findings for the demo rules.')
  }

  const recommendationDocs: RecommendationDoc[] = findings.map(({ finding, ruleId }) => ({
    _id: new ObjectId(),
    datasetId,
    ruleId,
    ...finding,
    createdAt: now
  }))

  /*
    The follow date sits four weeks back, so both fourteen-day windows land inside
    the eight weeks of seeded trading. Measuring against a window that runs past
    the end of the data would report a fortnight that never happened.
  */
  const lastDate = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), rows[0]!.date)
  const dayBefore = (date: string, days: number) =>
    new Date(new Date(`${date}T00:00:00Z`).getTime() - days * 86_400_000).toISOString().slice(0, 10)

  const followedDate = dayBefore(lastDate, OUTCOME_WINDOW_DAYS)
  const beforeStart = dayBefore(followedDate, OUTCOME_WINDOW_DAYS)

  /** Monday is 0, matching summary.get.ts and the rules engine. */
  const weekdayOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  /*
    The same grouping the engine used to find the finding in the first place. If
    this measured revenue while the rule counted units, the outcome would be
    answering a different question from the one the owner was asked.
  */
  function scopeMatches(row: SalesRowDoc, dimension: string, value: string): boolean {
    if (dimension === 'dayOfWeek') return WEEKDAYS[weekdayOf(row.date)] === value
    if (dimension === 'item') return row.itemName === value
    if (dimension === 'category') return (row.category ?? 'Uncategorised') === value
    return false
  }

  function metricOf(scoped: SalesRowDoc[], metric: string): number {
    if (metric === 'quantity') return scoped.reduce((sum, row) => sum + row.quantity, 0)
    if (metric === 'orders') return scoped.length
    return Math.round(scoped.reduce((sum, row) => sum + row.revenue, 0) * 100) / 100
  }

  function windowFor(from: string, to: string, dimension: string, dimensionValue: string, metric: string) {
    const inWindow = rows.filter(row => row.date >= from && row.date < to)
    const scoped = inWindow.filter(row => scopeMatches(row, dimension, dimensionValue))
    const dates = new Set(inWindow.map(row => row.date))

    return {
      value: metricOf(scoped, metric),
      window: {
        periodStart: from,
        periodEnd: dayBefore(to, 1),
        sourceRowCount: inWindow.length,
        distinctSalesDates: dates.size,
        missingSalesDates: OUTCOME_WINDOW_DAYS - dates.size,
        datasetVersionId: null
      }
    }
  }

  // One outcome per finding, capped at four: enough for the list and the
  // scoreboard without burying the recommendations page in demo rows.
  const measured = recommendationDocs.slice(0, 4)

  const outcomes: OutcomeDoc[] = measured.map((recommendation, index) => {
    const dimensionValue = recommendation.dimensionValue!
    /*
      Both windows are half-open: from the start date up to but not including the
      end. `followedDate` is fourteen days before the last day of data, so the
      after window is exactly followedDate through the day before the last, and
      the last day itself is left out rather than making a fifteenth.
    */
    const before = windowFor(beforeStart, followedDate, recommendation.dimension, dimensionValue, recommendation.metric)
    const after = windowFor(followedDate, lastDate, recommendation.dimension, dimensionValue, recommendation.metric)

    /*
      The first one stays pending, and the rest are measured.

      Pending rather than measured because it is the realistic state for a finding
      the owner has only just acted on, and first rather than last because the item
      findings sort after the weekday ones. Leaving the last one pending would put
      the only finding with jittery fortnight-to-fortnight quantities into the slot
      that never gets a verdict, and every measured outcome would then come from
      the deliberately stable weekday data and read "no clear effect".
    */
    const pending = index === 0

    const changePercent = before.value === 0
      ? null
      : Math.round(((after.value - before.value) / before.value) * 1000) / 10

    const status = pending
      ? 'pending'
      : before.value === 0
        ? after.value === 0 ? 'no_clear_effect' : 'improved'
        : changePercent !== null && Math.abs(changePercent) <= OUTCOME_NO_CLEAR_EFFECT_PERCENT
          ? 'no_clear_effect'
          : (changePercent ?? 0) > 0 ? 'improved' : 'worsened'

    const outcome = outcomeSchema.parse({
      id: new ObjectId().toHexString(),
      recommendationId: recommendation._id.toHexString(),
      datasetId,
      followedDate,
      note: index === 0 ? 'Ran a two-for-one on mains and moved one server to Friday.' : null,
      windowDays: OUTCOME_WINDOW_DAYS,
      recommendation: {
        title: recommendation.title,
        body: recommendation.body,
        action: recommendation.action,
        metric: recommendation.metric,
        dimension: recommendation.dimension,
        dimensionValue,
        operator: recommendation.operator!,
        expectedDirection: recommendation.expectedDirection!,
        recommendationCreatedAt: recommendation.createdAt
      },
      beforeWindow: before.window,
      beforeValue: before.value,
      afterWindow: pending ? null : after.window,
      afterValue: pending ? null : after.value,
      changePercent: pending ? null : changePercent,
      hasMissingSalesDates: pending ? false : after.window.missingSalesDates > 0,
      status,
      completedAt: pending ? null : now,
      createdAt: now,
      updatedAt: now
    })

    const { id, ...rest } = outcome
    return { _id: new ObjectId(id), ...rest }
  })

  return { rules: ruleDocs, recommendations: recommendationDocs, outcomes }
}

async function seed(): Promise<void> {
  const additive = process.argv.includes('--add')
  const now = new Date().toISOString()
  const datasetId = new ObjectId()
  const datasetIdHex = datasetId.toHexString()

  const { docs: salesRowDocs, periodStart, periodEnd } = buildSalesRows(datasetIdHex)

  const userDocs = await buildUsers(now)

  /*
    The demo data set belongs to the demo owner, not to nobody.

    Every read in the product now filters by `ownerId`, so a seeded data set with
    no owner is invisible to every account: the dashboard, the recommendations and
    the history page would all render their empty state on a freshly seeded
    database, which looks exactly like a broken build.

    Matched by username rather than by position, so reordering `seedAccounts()`
    cannot quietly reassign the demo data to an admin.

    The id is resolved from the database further down rather than taken from this
    document, and that distinction is the whole bug this comment exists to prevent.
    `buildUsers` mints a fresh ObjectId every run, but the additive branch upserts
    users by username with `$setOnInsert: { _id }`, so an account that already
    exists keeps the id it was created with and the freshly minted one is thrown
    away. Using it anyway pointed two seeded data sets at a user that does not
    exist, which is invisible to every account and looks exactly like empty data.
  */
  const demoOwnerUsername = (process.env.AUTH_USERNAME || 'owner').toLowerCase()
  const demoOwner = userDocs.find(user => user.username === demoOwnerUsername)

  if (!demoOwner) {
    throw new Error(`The demo owner account "${demoOwnerUsername}" was not built, so the demo data set would have no owner.`)
  }

  const dataset = datasetSchema.parse({
    id: datasetIdHex,
    // Replaced below once the real owner id is known. Parsed with a placeholder
    // only so this schema check still runs on every other field.
    ownerId: demoOwner._id.toHexString(),
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

  const [users, datasets, salesRows, insights, recommendations, rules, outcomes] = await Promise.all([
    usersCollection(),
    datasetsCollection(),
    salesRowsCollection(),
    publishedInsightsCollection(),
    recommendationsCollection(),
    rulesCollection(),
    outcomesCollection()
  ])

  const { id: dsId, ...datasetRest } = dataset

  /*
    Users are written before anything that references them, and the owner id is
    read back from the database rather than assumed.

    On a first run the two are the same. On a second `--add` run they are not: the
    upsert below matches an existing account by username and leaves its `_id`
    alone, so the id `buildUsers` minted this run belongs to nobody. Everything
    stamped with it would be unreachable by the account it was meant for.
  */
  async function resolveOwnerId(): Promise<string> {
    const persisted = await users.findOne({ username: demoOwnerUsername })

    if (!persisted) {
      throw new Error(`The demo owner "${demoOwnerUsername}" is not in the database after the user write.`)
    }

    return persisted._id.toHexString()
  }

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

    const ownerId = await resolveOwnerId()
    const seeded = await seedOutcomes(datasetIdHex, ownerId, salesRowDocs, now)

    await datasets.insertOne({ _id: new ObjectId(dsId), ...datasetRest, ownerId } satisfies DatasetDoc)
    await salesRows.insertMany(salesRowDocs)
    await insights.insertMany(insightDocs)
    await rules.insertMany(seeded.rules)
    await recommendations.insertMany(seeded.recommendations)
    await outcomes.insertMany(seeded.outcomes)

    const currentVersionId = await seedVersions(datasetIdHex, salesRowDocs)
    await datasets.updateOne({ _id: new ObjectId(dsId) }, { $set: { currentVersionId } })

    console.log('')
    console.log('  Additive seed complete — nothing was deleted')
    console.log('  ──────────────────────────────────────────────')
    console.log(`  Database         ${process.env.MONGODB_DB}`)
    console.log(`  Users added      ${userWrites.upsertedCount}`)
    console.log(`  Users updated    ${userWrites.matchedCount}`)
    console.log(`  Owner            ${demoOwnerUsername}  (${ownerId})`)
    console.log(`  Data set added   1  (${dataset.name})`)
    console.log(`  Data set id      ${datasetIdHex}`)
    console.log(`  Sales rows added ${salesRowDocs.length}`)
    console.log(`  Insights added   ${insightDocs.length}`)
    console.log(`  Rules added      ${seeded.rules.length}`)
    console.log(`  Findings added   ${seeded.recommendations.length}`)
    console.log(`  Outcomes added   ${seeded.outcomes.length}`)
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
    rules: await rules.countDocuments(),
    outcomes: await outcomes.countDocuments(),
    datasetVersions: await versions.countDocuments(),
    datasetVersionRows: await versionRows.countDocuments()
  })

  // Wiping first is what makes a second run replace the demo rather than double it.
  // `rules` is now in the list: the demo owns one, and the seeded outcomes measure
  // the findings it produces, so leaving it behind would strand them.
  const removed = await Promise.all([
    users.deleteMany({}),
    datasets.deleteMany({}),
    salesRows.deleteMany({}),
    insights.deleteMany({}),
    recommendations.deleteMany({}),
    rules.deleteMany({}),
    // Outcomes measure recommendations that are about to be replaced. A surviving
    // outcome would point at a finding that no longer exists and still be counted
    // by the scoreboard.
    outcomes.deleteMany({}),
    // Upload history belongs to the data sets being replaced, so it goes with them.
    // Leaving it would offer restore buttons pointing at rows that no longer exist.
    versions.deleteMany({}),
    versionRows.deleteMany({})
  ])
  const removedCount = removed.reduce((sum, result) => sum + result.deletedCount, 0)

  await users.insertMany(userDocs)

  // Read back rather than assumed, for the same reason as the additive branch.
  // Here the two always agree, but a single rule is easier to keep true than two.
  const ownerId = await resolveOwnerId()
  const seeded = await seedOutcomes(datasetIdHex, ownerId, salesRowDocs, now)

  await datasets.insertOne({ _id: new ObjectId(dsId), ...datasetRest, ownerId } satisfies DatasetDoc)
  await salesRows.insertMany(salesRowDocs)
  await insights.insertMany(insightDocs)
  await rules.insertMany(seeded.rules)
  await recommendations.insertMany(seeded.recommendations)
  await outcomes.insertMany(seeded.outcomes)

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
  console.log(`  Rules            ${seeded.rules.length}`)
  console.log(`  Findings         ${seeded.recommendations.length}`)
  console.log(`  Outcomes         ${seeded.outcomes.length}  (${seeded.outcomes.map(o => o.status).join(', ')})`)
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
