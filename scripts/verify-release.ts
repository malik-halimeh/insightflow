/**
 * Release-gate verification against the running server and the real database.
 *
 * Run it with the dev server up:
 *
 *   npm run dev
 *   npm run verify
 *
 * There is no test framework in this project and adding one is a change to the
 * stack list in CLAUDE.md. This is the agreed substitute: a script that asserts
 * against the real database, prints what it checked, exits non-zero on failure,
 * and removes everything it created.
 *
 * Sessions are minted with `createSessionToken` rather than by posting to the
 * login route. That is deliberate: the thing under test is authorisation, not
 * authentication, and minting directly is how two different owners get a session
 * each without a password going anywhere near this script.
 *
 * Two throwaway owners are created and destroyed here. Nothing belonging to the
 * team is read or written.
 */
import { ObjectId } from 'mongodb'
import {
  closeMongoClient,
  datasetsCollection,
  outcomesCollection,
  publishedInsightsCollection,
  recommendationsCollection,
  salesRowsCollection,
  usersCollection,
  type OutcomeDoc
} from '../server/utils/db'
import { createSessionToken } from '../server/utils/session'
import { SESSION_COOKIE } from '../shared/schemas'

try { process.loadEnvFile() } catch { /* environment already carries the values */ }

const BASE = 'http://localhost:3000'
const secret = process.env.SESSION_SECRET ?? ''
if (!secret) throw new Error('SESSION_SECRET is not set, so a session cannot be minted.')

const checks: { group: string, name: string, pass: boolean, detail: string }[] = []
function check(group: string, name: string, pass: boolean, detail = '') {
  checks.push({ group, name, pass, detail })
}

interface Actor { id: string, username: string, cookie: string }

async function makeOwner(suffix: string): Promise<Actor> {
  const _id = new ObjectId()
  const username = `zz-verify-${suffix}-${_id.toHexString().slice(-6)}`
  await (await usersCollection()).insertOne({
    _id,
    username,
    email: `${username}@example.invalid`,
    displayName: `ZZ Verify ${suffix}`,
    role: 'business_owner',
    status: 'approved',
    businessSize: 'small',
    phone: '+44 20 7946 0999',
    location: 'Testville',
    estimatedCustomersPerMonth: 100,
    createdAt: new Date().toISOString(),
    passwordHash: 'not-a-real-hash-this-account-cannot-sign-in'
  })
  const id = _id.toHexString()
  return {
    id,
    username,
    cookie: `${SESSION_COOKIE}=${createSessionToken(id, username, `ZZ Verify ${suffix}`, 'business_owner', secret)}`
  }
}

async function call(actor: Actor | null, path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(actor ? { cookie: actor.cookie } : {}),
      ...(init.headers ?? {})
    }
  })
  const text = await response.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch { /* keep the raw text */ }
  return { status: response.status, body: body as Record<string, unknown> }
}

async function main() {
  const alice = await makeOwner('alice')
  const bob = await makeOwner('bob')
  const created: string[] = []

  try {
    // ---------------------------------------------------------------- 1. auth
    const anon = await call(null, '/api/datasets')
    check('auth', 'no session is refused', anon.status === 401, `${anon.status}`)

    // -------------------------------------------------- 2. persistence refresh
    const made = await call(alice, '/api/datasets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'ZZ Alice verification set',
        businessType: 'restaurant',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28'
      })
    })
    check('persistence', 'a data set can be created', made.status === 200 || made.status === 201, `${made.status}`)
    const aliceSet = String((made.body as { id?: string }).id ?? '')
    if (aliceSet) created.push(aliceSet)

    check('persistence', 'the server assigns the owner, not the client',
      (made.body as { ownerId?: string }).ownerId === alice.id)

    const readBack = await call(alice, `/api/datasets/${aliceSet}`)
    check('persistence', 'it survives a fresh request', readBack.status === 200, `${readBack.status}`)
    check('persistence', 'it reads back with the same name',
      (readBack.body as { name?: string }).name === 'ZZ Alice verification set')

    const stored = await (await datasetsCollection()).findOne({ _id: new ObjectId(aliceSet) })
    check('persistence', 'it is really in the database', stored !== null)
    check('persistence', 'ownerId persisted', stored?.ownerId === alice.id)

    // Rows, so the upload path and the version pointer are exercised too.
    const csv = [
      'date,item,quantity,price',
      '2026-02-01,House Fries,10,3.00',
      '2026-02-02,House Fries,12,3.00',
      '2026-02-03,Lasagne,4,12.50'
    ].join('\n')
    const upload = await call(alice, `/api/datasets/${aliceSet}/rows`, {
      method: 'POST',
      body: JSON.stringify({ csv })
    })
    check('persistence', 'rows import', upload.status === 200 && (upload.body as { imported?: number }).imported === 3,
      `${upload.status} imported=${(upload.body as { imported?: number }).imported}`)

    const rowsBack = await call(alice, `/api/datasets/${aliceSet}/rows`)
    check('persistence', 'rows read back after the write',
      Array.isArray(rowsBack.body) && (rowsBack.body as unknown[]).length === 3,
      `${Array.isArray(rowsBack.body) ? (rowsBack.body as unknown[]).length : '?'} rows`)

    // ----------------------------------------------------- 3. tenant isolation
    const bobSetResponse = await call(bob, '/api/datasets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'ZZ Bob verification set',
        businessType: 'retail',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28'
      })
    })
    const bobSet = String((bobSetResponse.body as { id?: string }).id ?? '')
    if (bobSet) created.push(bobSet)

    const aliceList = await call(alice, '/api/datasets')
    const aliceNames = (aliceList.body as { name: string }[]).map(d => d.name)
    check('isolation', 'the list shows only the caller\'s data sets',
      aliceNames.includes('ZZ Alice verification set') && !aliceNames.includes('ZZ Bob verification set'),
      `${aliceNames.length} returned`)

    const analyticsList = await call(alice, '/api/analytics/datasets')
    const analyticsNames = (analyticsList.body as { name: string }[]).map(d => d.name)
    check('isolation', 'the dashboard switcher is scoped too',
      !analyticsNames.includes('ZZ Bob verification set'))

    for (const [label, path, init] of [
      ['read', `/api/datasets/${bobSet}`, {}],
      ['rows', `/api/datasets/${bobSet}/rows`, {}],
      ['analytics', `/api/analytics/${bobSet}/summary`, {}],
      ['edit', `/api/datasets/${bobSet}`, { method: 'PUT', body: JSON.stringify({ name: 'hijacked name', businessType: 'retail', periodStart: '2026-02-01', periodEnd: '2026-02-28' }) }],
      ['upload', `/api/datasets/${bobSet}/rows`, { method: 'POST', body: JSON.stringify({ csv }) }],
      ['delete', `/api/datasets/${bobSet}`, { method: 'DELETE' }]
    ] as [string, string, RequestInit][]) {
      const attempt = await call(alice, path, init)
      check('isolation', `${label} of another owner's data set answers 404`,
        attempt.status === 404, `${attempt.status}`)
    }

    const bobStill = await (await datasetsCollection()).findOne({ _id: new ObjectId(bobSet) })
    check('isolation', 'the other owner\'s data set is untouched by all of that',
      bobStill?.name === 'ZZ Bob verification set', String(bobStill?.name))

    // ----------------------------------------------------- 4. duplicate request
    // The outcome route is M4's and not built yet, so this exercises the guarantee
    // M1 owns: the unique index, which is what makes a retry safe to catch.
    const recommendationId = new ObjectId().toHexString()
    const outcomes = await outcomesCollection()
    const base = {
      recommendationId,
      datasetId: aliceSet,
      followedDate: '2026-02-10',
      note: null,
      windowDays: 14,
      recommendation: {
        title: 't', body: 'b', action: 'a', metric: 'revenue', dimension: 'item',
        dimensionValue: 'House Fries', operator: 'below_average_by',
        expectedDirection: 'up', recommendationCreatedAt: new Date().toISOString()
      },
      beforeWindow: { periodStart: '2026-01-27', periodEnd: '2026-02-09', sourceRowCount: 1, distinctSalesDates: 1, missingSalesDates: 13, datasetVersionId: null },
      beforeValue: 10,
      afterWindow: null, afterValue: null, changePercent: null,
      hasMissingSalesDates: false, status: 'pending', completedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }

    await outcomes.insertOne({ _id: new ObjectId(), ...base } as OutcomeDoc)
    let duplicateRejected = false
    try {
      await outcomes.insertOne({ _id: new ObjectId(), ...base } as OutcomeDoc)
    } catch (error) {
      duplicateRejected = (error as { code?: number }).code === 11000
    }
    check('duplicate', 'a second outcome for one recommendation is refused', duplicateRejected)
    check('duplicate', 'exactly one outcome survives',
      await outcomes.countDocuments({ recommendationId }) === 1)

    // The publish route's own idempotency, over HTTP.
    const recs = await recommendationsCollection()
    const recId = new ObjectId()
    await recs.insertOne({
      _id: recId, datasetId: aliceSet, ruleId: null,
      title: 'ZZ verification finding', body: 'b', action: 'a',
      metric: 'revenue', dimension: 'item', dimensionValue: 'House Fries',
      operator: 'below_average_by', expectedDirection: 'up',
      changePercent: -30, severity: 'warning', createdAt: new Date().toISOString()
    })

    const publishBody = JSON.stringify({
      recommendationId: recId.toHexString(),
      displayName: 'ZZ Verify Alice',
      caption: 'A verification caption long enough to satisfy the schema rules.',
      hideAbsoluteNumbers: true
    })
    const first = await call(alice, '/api/publish', { method: 'POST', body: publishBody })
    const second = await call(alice, '/api/publish', { method: 'POST', body: publishBody })
    check('duplicate', 'publishing twice returns one insight, not two',
      first.status < 400 && second.status < 400
      && (first.body as { id?: string }).id === (second.body as { id?: string }).id,
      `${first.status}/${second.status}`)
    check('duplicate', 'only one published insight exists for it',
      await (await publishedInsightsCollection()).countDocuments({ recommendationId: recId.toHexString() }) === 1)

    const bobPublish = await call(bob, '/api/publish', { method: 'POST', body: publishBody })
    check('isolation', 'another owner cannot publish this finding', bobPublish.status === 404, `${bobPublish.status}`)

    const bobUnpublish = await call(bob, `/api/publish/${recId.toHexString()}`, { method: 'DELETE' })
    check('isolation', 'another owner cannot unpublish it', bobUnpublish.status === 404, `${bobUnpublish.status}`)

    /*
      A second outcome, so the deletion counts below are 1 published insight and
      2 outcomes rather than 1 and 1. With equal counts a swapped pair of labels
      reports the right numbers by accident and the assertions pass through the
      bug they exist to catch.
    */
    await outcomes.insertOne({
      _id: new ObjectId(),
      ...base,
      recommendationId: new ObjectId().toHexString()
    } as OutcomeDoc)

    // -------------------------------------------------------- 5. deletion flow
    const beforeCounts = {
      rows: await (await salesRowsCollection()).countDocuments({ datasetId: aliceSet }),
      recs: await recs.countDocuments({ datasetId: aliceSet }),
      insights: await (await publishedInsightsCollection()).countDocuments({ datasetId: aliceSet }),
      outcomes: await outcomes.countDocuments({ datasetId: aliceSet })
    }

    const removed = await call(alice, `/api/datasets/${aliceSet}`, { method: 'DELETE' })
    const reported = (removed.body as { deleted?: Record<string, number | string> }).deleted ?? {}

    check('deletion', 'the delete succeeds', removed.status === 200, `${removed.status}`)
    check('deletion', 'salesRows count is labelled correctly',
      reported.salesRows === beforeCounts.rows, `reported ${reported.salesRows}, actual ${beforeCounts.rows}`)
    check('deletion', 'recommendations count is labelled correctly',
      reported.recommendations === beforeCounts.recs, `reported ${reported.recommendations}, actual ${beforeCounts.recs}`)
    check('deletion', 'publishedInsights count is labelled correctly',
      reported.publishedInsights === beforeCounts.insights, `reported ${reported.publishedInsights}, actual ${beforeCounts.insights}`)
    check('deletion', 'outcomes count is labelled correctly',
      reported.outcomes === beforeCounts.outcomes, `reported ${reported.outcomes}, actual ${beforeCounts.outcomes}`)

    for (const [label, count] of [
      ['sales rows', await (await salesRowsCollection()).countDocuments({ datasetId: aliceSet })],
      ['recommendations', await recs.countDocuments({ datasetId: aliceSet })],
      ['published insights', await (await publishedInsightsCollection()).countDocuments({ datasetId: aliceSet })],
      ['outcomes', await outcomes.countDocuments({ datasetId: aliceSet })]
    ] as [string, number][]) {
      check('deletion', `no ${label} survive`, count === 0, `${count} left`)
    }

    check('deletion', 'the data set itself is gone',
      await (await datasetsCollection()).countDocuments({ _id: new ObjectId(aliceSet) }) === 0)
  } finally {
    // Cleanup, whatever happened above.
    const ids = created
    await Promise.all([
      (await datasetsCollection()).deleteMany({ ownerId: { $in: [alice.id, bob.id] } }),
      (await salesRowsCollection()).deleteMany({ datasetId: { $in: ids } }),
      (await recommendationsCollection()).deleteMany({ datasetId: { $in: ids } }),
      (await publishedInsightsCollection()).deleteMany({ datasetId: { $in: ids } }),
      (await outcomesCollection()).deleteMany({ datasetId: { $in: ids } }),
      (await usersCollection()).deleteMany({ _id: { $in: [new ObjectId(alice.id), new ObjectId(bob.id)] } })
    ])
  }

  let group = ''
  for (const c of checks) {
    if (c.group !== group) { group = c.group; console.log(`\n  ${group.toUpperCase()}`) }
    console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  (' + c.detail + ')' : ''}`)
  }
  const failed = checks.filter(c => !c.pass).length
  console.log(`\n  ${checks.length - failed}/${checks.length} passed`)
  await closeMongoClient()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  await closeMongoClient().catch(() => {})
  process.exit(1)
})
