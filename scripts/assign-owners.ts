/**
 * Gives every existing data set and rule an owner.
 *
 * Per-owner scoping keys every read on `ownerId`. Records written before that
 * field existed have none, so after the change they are invisible to every
 * account: they are not lost, but nothing in the product can reach them.
 *
 * This assigns them once. Run it after deploying the scoping change and before
 * anyone signs in expecting to see their data.
 *
 *   npx tsx scripts/assign-owners.ts --to <username>     assign to one account
 *   npx tsx scripts/assign-owners.ts --dry-run           report, change nothing
 *
 * Idempotent: it only ever touches documents with no `ownerId`, so running it
 * twice is harmless and running it after new data has been created correctly
 * does nothing.
 *
 * WHY IT ASKS RATHER THAN GUESSES
 * There is no record of who uploaded what, because until now nothing was owned.
 * Any rule this script could invent for splitting the existing data between
 * accounts would be a guess, and a wrong guess hands one business another's
 * takings. Naming the account makes that one decision explicit and auditable.
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

  const orphanDatasets = await datasets.countDocuments(orphanFilter)
  const orphanRules = await rules.countDocuments(orphanFilter)

  console.log(`  Data sets with no owner   ${orphanDatasets}`)
  console.log(`  Rules with no owner       ${orphanRules}`)

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
    console.log(`\n  Dry run. Would assign ${orphanDatasets} data set(s) and ${orphanRules} rule(s) to ${owner.username}.`)
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
