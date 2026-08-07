import { ObjectId } from 'mongodb'
import type { DatasetQuality, DatasetVersion } from '#shared/schemas'
import {
  datasetVersionRowsCollection,
  datasetVersionsCollection,
  salesRowsCollection,
  type DatasetVersionRowDoc,
  type SalesRowDoc
} from './db'

/**
 * Upload history for a data set.
 *
 * Every upload is recorded, and the rows it brought are archived, so an owner can
 * see what they uploaded and go back to it. The rows of the *current* version stay
 * in `salesRows` untouched — see the note on COLLECTIONS in ./indexes.ts for why
 * they cannot simply all live there together.
 *
 * All of the logic lives in this file on purpose. The upload handler that calls it
 * belongs to another member, and a helper that owns its own gate, its own cap and
 * its own failure behaviour is one they can call in a single line and never revisit.
 */

/**
 * What `recordVersion` needs from a row, and nothing more.
 *
 * Deliberately loose about `_id` and `datasetId`: the upload handler already has
 * documents carrying both, and asking it to strip them first would make a one-line
 * integration into a three-line one for no gain.
 */
export type SalesRowArchiveInput = Omit<SalesRowDoc, '_id' | 'datasetId'> & {
  _id?: ObjectId
  datasetId?: string
}

/** Older versions beyond this are dropped, archive and all. */
const VERSION_LIMIT = 10

/** Four weeks. Below this there is not enough trading history to read a pattern from. */
const THIN_DATA_DAYS = 28

/**
 * Is upload history switched on? Read here so no call site has to remember to ask.
 *
 * Inside Nitro this comes from runtimeConfig, which applies any NUXT_-prefixed
 * override the host sets. `scripts/seed.ts` runs outside Nitro, where
 * `useRuntimeConfig` does not exist, so it falls back to the same environment
 * variable — the same arrangement, and the same reasoning, as `readConfig()` in ./db.ts.
 */
export function versioningEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().versioningEnabled)
  } catch {
    return process.env.VERSIONING_ENABLED === 'true'
  }
}

/**
 * What is wrong with this upload beyond the rows the importer already rejected.
 *
 * Warnings, never blocks. An owner whose export is missing a Tuesday still needs
 * their dashboard — they just need to know before they read a weekly pattern into it.
 */
export function assessQuality(rows: Pick<SalesRowDoc, 'date' | 'itemName' | 'unitPrice' | 'quantity'>[]): DatasetQuality {
  const tradingDays = new Set(rows.map(row => row.date))

  // Calendar days between the first and last sale with nothing recorded at all.
  // Counted against the calendar rather than against the days present, so a week
  // with no Sunday trading reads as six days of data and one missing.
  let missingDays = 0
  const sorted = [...tradingDays].sort((a, b) => a.localeCompare(b))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  if (first && last) {
    for (let day = new Date(`${first}T00:00:00Z`); day <= new Date(`${last}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
      if (!tradingDays.has(day.toISOString().slice(0, 10))) missingDays++
    }
  }

  // The same item, at the same price, twice on one day. Usually the same export
  // uploaded twice rather than a genuine second sale recorded separately.
  const seen = new Set<string>()
  let duplicateRows = 0
  for (const row of rows) {
    const key = `${row.date}|${row.itemName}|${row.unitPrice}|${row.quantity}`
    if (seen.has(key)) duplicateRows++
    else seen.add(key)
  }

  return { missingDays, duplicateRows, thin: tradingDays.size < THIN_DATA_DAYS }
}

/**
 * Records an upload and archives its rows.
 *
 * Call this *after* the new rows are safely in `salesRows`, not before:
 *
 *   1. replace `salesRows` with the uploaded rows,
 *   2. then call this to archive them as a version.
 *
 * The upload handler deletes the old rows before inserting the new ones. Archiving
 * in between would mean a failure here leaves the old rows already gone and the new
 * ones not yet written — an empty data set. Archiving afterwards means the worst a
 * failure costs is a missing history entry, with the owner's rows intact and correct.
 *
 * Returns null when the feature is switched off, so the caller needs no flag check.
 */
export async function recordVersion(
  datasetId: string,
  rows: SalesRowArchiveInput[],
  rejectedCount: number
): Promise<DatasetVersion | null> {
  if (!versioningEnabled()) return null

  return writeVersion(datasetId, rows, rejectedCount)
}

/**
 * The same work, without the feature-flag check.
 *
 * `scripts/seed.ts` uses this: the seed builds demo state rather than responding to
 * a request, so whether the feature is switched on for a running site says nothing
 * about whether the demo should have an upload history. Everything at runtime goes
 * through `recordVersion` above and stays gated.
 */
export async function writeVersion(
  datasetId: string,
  rows: SalesRowArchiveInput[],
  rejectedCount: number
): Promise<DatasetVersion | null> {
  if (rows.length === 0) return null

  const versions = await datasetVersionsCollection()

  // Counted from the newest rather than from how many survive, so the number an
  // owner sees keeps climbing after the cap has dropped version 1.
  const [newest] = await versions
    .find({ datasetId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()

  const versionNumber = (newest?.versionNumber ?? 0) + 1
  const versionId = new ObjectId()
  const dates = rows.map(row => row.date).sort((a, b) => a.localeCompare(b))

  // The spread comes first and the archive's own keys after, so a caller handing
  // over rows that already carry `_id` and `datasetId` — which the upload handler
  // does — gets a genuinely new archive row rather than one reusing the live id.
  const archived: DatasetVersionRowDoc[] = rows.map(row => ({
    ...row,
    _id: new ObjectId(),
    versionId: versionId.toHexString(),
    datasetId
  }))

  await (await datasetVersionRowsCollection()).insertMany(archived)

  const version: Omit<DatasetVersion, 'id'> = {
    datasetId,
    versionNumber,
    rowCount: rows.length,
    rejectedCount,
    periodStart: dates[0]!,
    periodEnd: dates[dates.length - 1]!,
    quality: assessQuality(rows),
    createdAt: new Date().toISOString()
  }

  await versions.insertOne({ _id: versionId, ...version })
  await pruneVersions(datasetId)

  return { id: versionId.toHexString(), ...version }
}

/**
 * Drops the oldest versions past the cap, archive included.
 *
 * Every version keeps its own copy of its rows, so without this the archive grows
 * without limit for an owner who uploads every morning.
 */
export async function pruneVersions(datasetId: string): Promise<number> {
  const versions = await datasetVersionsCollection()

  const surplus = await versions
    .find({ datasetId })
    .sort({ createdAt: -1 })
    .skip(VERSION_LIMIT)
    .toArray()

  if (surplus.length === 0) return 0

  const ids = surplus.map(version => version._id.toHexString())

  // Rows first. A failure between the two leaves archived rows whose version is
  // gone, which is invisible and harmless; the reverse leaves a version an owner
  // can see and click restore on, with nothing behind it.
  await (await datasetVersionRowsCollection()).deleteMany({ versionId: { $in: ids } })
  await versions.deleteMany({ _id: { $in: surplus.map(version => version._id) } })

  return surplus.length
}

/**
 * Puts an archived version's rows back into `salesRows`.
 *
 * The archive is the record and is never consumed: restoring copies out of it and
 * leaves it intact, so the same version can be restored again later.
 */
export async function rehydrateVersion(datasetId: string, versionId: string): Promise<number> {
  const archived = await (await datasetVersionRowsCollection())
    .find({ versionId, datasetId })
    .sort({ date: 1 })
    .toArray()

  if (archived.length === 0) return 0

  const salesRows = await salesRowsCollection()

  const live: SalesRowDoc[] = archived.map(({ _id, versionId: _versionId, ...row }) => ({
    _id: new ObjectId(),
    ...row
  }))

  await salesRows.deleteMany({ datasetId })
  await salesRows.insertMany(live)

  return live.length
}
