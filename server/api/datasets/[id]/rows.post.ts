import { ObjectId } from 'mongodb'
import type { UploadReport } from '#shared/types/upload'
import { requireSession } from '../../../utils/auth'
import { readSalesRows, withRevenue } from '../../../utils/csv'
import { datasetsCollection, salesRowsCollection } from '../../../utils/db'

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
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  const datasets = await datasetsCollection()
  const dataset = await datasets.findOne({ _id: new ObjectId(id) })

  if (!dataset) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

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

  // The period comes from the data actually imported, not from what the owner
  // typed, so the dashboard never reports a range with no sales in it.
  await datasets.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        rowCount: documents.length,
        ...(report.periodStart ? { periodStart: report.periodStart } : {}),
        ...(report.periodEnd ? { periodEnd: report.periodEnd } : {}),
        updatedAt: new Date().toISOString()
      }
    }
  )

  return { ...report, imported: documents.length }
})
