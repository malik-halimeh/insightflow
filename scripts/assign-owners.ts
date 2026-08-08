/**
 * Brings records written before Phase 2 up to the current contracts.
 *
 * Two migrations, both idempotent, both only ever touching documents that are
 * missing the field in question:
 *
 *   1. `ownerId` on data sets and rules. Per-owner scoping keys every read on it,
 *      so a record without one is invisible to every account. Not lost, but
 *      unreachable.
 *
 *   2. `expectedDirection` on rules. Outcome tracking needs to know which way a
 *      number should move for the advice to have worked, and `ruleSchema` now
 *      requires it, so a rule without one throws when the engine parses it.
 *
 * Run after deploying, before anyone signs in expecting to see their data.
 *
 *   npx tsx scripts/assign-owners.ts                   report what needs doing
 *   npx tsx scripts/assign-owners.ts --to <username>   assign owners and migrate
 *   npx tsx scripts/assign-owners.ts --dry-run --to x  report, change nothing
 *
 * WHY THE OWNER IS ASKED FOR AND THE DIRECTION IS NOT
 * There is no record of who uploaded what, because until now nothing was owned.
 * Any rule this script could invent for splitting existing data between accounts
 * would be a guess, and a wrong guess hands one business another's takings.
 *
 * The direction has a safe default and the owner can see and change it on the
 * rule form. Almost all advice in this product is about lifting something that is
 * underperforming, so every existing rule becomes 'up'. Where that is wrong, the
 * rule is visibly wrong on a screen the author already visits, rather than
 * silently wrong in a measurement nobody can audit.
 */
import {
  closeMongoClient,
  datasetsCollection,
  rulesCollection,
  usersCollection
} from '../server/utils/db'

try { process.loadEnvFile() } catch { /* environment already carries the values */ }

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const target = argValue('--to')

  const datasets = await datasetsCollection()
  const rules = await rulesCollection()
  const users = await usersCollection()

  // `$exists: false` rather than a null check: these documents predate the field
  // entirely, so it is absent rather than empty.
  const orphanFilter = { ownerId: { $exists: false } }

  // Independent of the owner question, so it runs whether or not --to is given.
  const directionlessFilter = { expectedDirection: { $exists: false } }

  const orphanDatasets = await datasets.countDocuments(orphanFilter)
  const orphanRules = await rules.countDocuments(orphanFilter)
  const directionlessRules = await rules.countDocuments(directionlessFilter)

  console.log(`  Data sets with no owner        ${orphanDatasets}`)
  console.log(`  Rules with no owner            ${orphanRules}`)
  console.log(`  Rules with no direction        ${directionlessRules}`)

  // Done first and unconditionally. It needs no decision from anyone, and until
  // it has run the rules engine throws on every rule it reads.
  if (directionlessRules > 0 && !dryRun) {
    const migrated = await rules.updateMany(
      directionlessFilter,
      { $set: { expectedDirection: 'up' } }
    )
    console.log(`\n  Set expectedDirection to "up" on ${migrated.modifiedCount} rule(s).`)
    console.log('  Check any rule whose advice is meant to bring a number down.')
  }

  if (orphanDatasets === 0 && orphanRules === 0) {
    console.log('\n  Nothing to assign. Every data set and rule already has an owner.')
    return
  }

  if (!target) {
    const owners = await users
      .find({ role: 'business_owner' }, { projection: { username: 1, displayName: 1 } })
      .sort({ username: 1 })
      .toArray()

    console.log('\n  Choose an account to assign them to, then run again with --to <username>.')
    console.log('  Business owner accounts on this database:\n')
    for (const owner of owners) console.log(`    ${owner.username.padEnd(20)} ${owner.displayName}`)
    console.log('')
    process.exitCode = 1
    return
  }

  const owner = await users.findOne({
    username: target.toLowerCase(),
    role: 'business_owner'
  })

  if (!owner) {
    throw new Error(`No business owner account called "${target}". Run without --to to list them.`)
  }

  const ownerId = owner._id.toHexString()

  if (dryRun) {
    console.log(`\n  Dry run. Would assign ${orphanDatasets} data set(s) and ${orphanRules} rule(s) to ${owner.username},`)
    console.log(`  and set expectedDirection to "up" on ${directionlessRules} rule(s).`)
    return
  }

  const [datasetResult, ruleResult] = await Promise.all([
    datasets.updateMany(orphanFilter, { $set: { ownerId } }),
    rules.updateMany(orphanFilter, { $set: { ownerId } })
  ])

  console.log(`\n  Assigned to ${owner.username} (${owner.displayName})`)
  console.log(`    Data sets   ${datasetResult.modifiedCount}`)
  console.log(`    Rules       ${ruleResult.modifiedCount}`)

  const remaining = await datasets.countDocuments(orphanFilter) + await rules.countDocuments(orphanFilter)
  console.log(`\n  Remaining without an owner: ${remaining}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeMongoClient()
  })
