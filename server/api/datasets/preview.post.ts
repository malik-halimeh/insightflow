import type { UploadReport } from '#shared/types/upload'
import { requireSession } from '../../utils/auth'
import { readSalesRows } from '../../utils/csv'

/**
 * Checks a spreadsheet without saving anything.
 *
 * Deliberately stateless: the owner presses "Check the file" before the data set
 * exists, and a file that turns out to be unusable must not leave an empty data
 * set behind for them to tidy up.
 */
export default defineEventHandler(async (event): Promise<UploadReport> => {
  requireSession(event)

  const body = await readBody<{ csv?: string }>(event)

  if (!body?.csv || body.csv.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file was received. Choose a CSV file and try again.'
    })
  }

  return readSalesRows(body.csv).report
})
