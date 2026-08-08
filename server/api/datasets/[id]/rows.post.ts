import { ObjectId } from 'mongodb'
import type { UploadReport } from '#shared/types/upload'
import { readSalesRows, withRevenue } from '../../../utils/csv'
import { datasetsCollection, salesRowsCollection } from '../../../utils/db'
import { requireOwnedDataset } from '../../../utils/ownership'
import { recordVersion } from '../../../utils/versioning'

/**
 * Imports the usable rows of a spreadsheet into an existing data set.
 *
 * Partial success is the normal case, not an error case. Six bad lines out of two
 * hundred import the other one hundred and ninety four and report the six; the
 * owner fixes those and uploads again. Refusing the whole file would be tidier to
 * write and useless to the person holding the till export.
 *
 * Re-uploading replaces the rows rather than adding to them, so importing the same
 * file twice cannot silently double a business's takings.
 */
export default defineEventHandler(async (event): Promise<UploadReport> => {
  // Ownership first, before a single row is read. An upload replaces every row in
  // the data set, so a missing check here would let one account overwrite another
  // business's sales outright rather than merely read them.
  const dataset = await requireOwnedDataset(event, getRouterParam(event, 'id'))
  const id = dataset._id.toHexString()
  const datasets = await datasetsCollection()

  const body = await readBody<{ csv?: string }>(event)

  if (!body?.csv || body.csv.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file was received. Choose a CSV file and try again.'
    })
  }

  const { rows, report } = readSalesRows(body.csv)

  if (rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'None of the rows in that file could be read, so nothing was imported. The problems are listed below.'
    })
  }

  const salesRows = await salesRowsCollection()

  // Replace rather than append. The alternative is an owner who uploads the same
  // export twice and sees their revenue double.
  await salesRows.deleteMany({ datasetId: id })

  const documents = rows.map(row => ({
    _id: new ObjectId(),
    datasetId: id,
    ...withRevenue(row)
  }))

  await salesRows.insertMany(documents)

  /*
    Record the upload in the data set's history, after the rows are safely in.

    Deliberately after `insertMany` rather than before. The replace above deletes
    the old rows first, so archiving in between would mean a failure here leaves
    the old rows gone and the new ones not yet written. Afterwards, the worst a
    failure costs is a missing history entry, with the owner's rows intact.

    `recordVersion` owns the feature flag and returns null when upload history is
    switched off, so there is nothing to check here. When it is off the data set
    keeps whatever `currentVersionId` it had, which for a data set that has never
    been restored is null.
  */
  const version = await recordVersion(id, documents, report.invalid)

  // The period comes from the data actually imported, not from what the owner
  // typed, so the dashboard never reports a range with no sales in it.
  await datasets.updateOne(
    { _id: dataset._id },
    {
      $set: {
        rowCount: documents.length,
        ...(report.periodStart ? { periodStart: report.periodStart } : {}),
        ...(report.periodEnd ? { periodEnd: report.periodEnd } : {}),
        // The rows in `salesRows` are now this version's, so the pointer moves
        // with them. Restoring an older upload moves it back.
        ...(version ? { currentVersionId: version.id } : {}),
        updatedAt: new Date().toISOString()
      }
    }
  )

  return { ...report, imported: documents.length }
})
