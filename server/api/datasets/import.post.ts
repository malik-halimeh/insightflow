import { ObjectId } from 'mongodb'
import { requireSession } from '../../utils/auth'
import { datasetsCollection, salesRowsCollection } from '../../utils/db'

// ---------------------------------------------------------------------------
// POST /api/datasets/import
//
// Accepts a multipart upload with the same CSV file plus the dataset metadata
// fields. Re-validates every row (the client may not have called /check first,
// or the file may have changed), saves only the valid rows, and returns the
// new dataset record.
//
// Design decisions:
//   - Re-parse the CSV on the server rather than trusting the client's row
//     count. The client's "check" pass is UX only — the source of truth is
//     always the file itself.
//   - Bulk-insert the valid rows in a single insertMany call. For a typical
//     restaurant CSV (a few hundred to a few thousand rows) this is fast
//     enough. At tens of thousands of rows the batch would need to be chunked,
//     but that is an unusual case for a single-period export.
//   - The dataset record is written first so a crash mid-import doesn't leave
//     orphaned rows without a parent. A failed import can be retried by the
//     owner — the dataset row count stays 0 until all rows land.
// ---------------------------------------------------------------------------

const REVENUE_TOLERANCE = 0.005

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z]/g, '')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length

  while (i < len) {
    const row: string[] = []

    while (i < len) {
      if (text[i] === '"') {
        i++
        let field = ''
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 2 }
            else { i++; break }
          } else { field += text[i++] }
        }
        row.push(field)
      } else {
        let field = ''
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++]
        }
        row.push(field.trim())
      }

      if (i < len && text[i] === ',') { i++ } else { break }
    }

    if (i < len && text[i] === '\r') i++
    if (i < len && text[i] === '\n') i++

    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      rows.push(row)
    }
  }

  return rows
}

interface ImportedRow {
  _id: ObjectId
  datasetId: string
  date: string
  itemName: string
  category?: string
  quantity: number
  unitPrice: number
  revenue: number
}

function tryParseRow(
  record: Record<string, string>,
  headerMap: Record<string, string>,
  datasetId: string
): ImportedRow | null {
  const get = (canonical: string) => {
    const header = headerMap[canonical] ?? canonical
    return (record[header] ?? '').trim()
  }

  const dateVal = get('date')
  if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return null

  const itemName = get('itemname')
  if (!itemName) return null

  const quantity = Number(get('quantity'))
  if (!Number.isInteger(quantity) || quantity <= 0) return null

  const unitPrice = Number(get('unitprice'))
  if (isNaN(unitPrice) || unitPrice <= 0) return null

  const revenue = Number(get('revenue'))
  if (isNaN(revenue) || revenue <= 0) return null
  if (Math.abs(revenue - quantity * unitPrice) > REVENUE_TOLERANCE) return null

  const categoryRaw = get('category')

  return {
    _id: new ObjectId(),
    datasetId,
    date: dateVal,
    itemName,
    ...(categoryRaw ? { category: categoryRaw } : {}),
    quantity,
    unitPrice,
    revenue
  }
}

export default defineEventHandler(async (event) => {
  requireSession(event)

  const formData = await readFormData(event)
  const file = formData.get('file')
  const name = String(formData.get('name') ?? '').trim()
  const businessType = String(formData.get('businessType') ?? '').trim()
  const periodStart = String(formData.get('periodStart') ?? '').trim()
  const periodEnd = String(formData.get('periodEnd') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || undefined

  if (!file || typeof file === 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Please upload a CSV file.' })
  }
  if (!name || name.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Please give this data set a name of at least 3 characters.' })
  }
  if (!['restaurant', 'retail', 'gym'].includes(businessType)) {
    throw createError({ statusCode: 400, statusMessage: 'Please choose a valid business type.' })
  }
  if (!periodStart || !periodEnd) {
    throw createError({ statusCode: 400, statusMessage: 'Please set the start and end dates.' })
  }
  if (periodEnd < periodStart) {
    throw createError({ statusCode: 400, statusMessage: 'The end date cannot be before the start date.' })
  }

  // Parse the CSV
  const arrayBuffer = await (file as File).arrayBuffer()
  const text = new TextDecoder('utf-8').decode(arrayBuffer)
  const rows = parseCsv(text)

  if (rows.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'The file is empty or has no data rows.' })
  }

  const headers = rows[0]
  const headerMap: Record<string, string> = {}
  for (const h of headers) {
    headerMap[normaliseHeader(h)] = h
  }

  // Create the dataset document first
  const now = new Date().toISOString()
  const datasetId = new ObjectId()
  const datasetHex = datasetId.toHexString()

  const datasets = await datasetsCollection()
  await datasets.insertOne({
    _id: datasetId,
    name,
    businessType: businessType as 'restaurant' | 'retail' | 'gym',
    periodStart,
    periodEnd,
    ...(notes ? { notes } : {}),
    rowCount: 0,
    currentVersionId: null,
    createdAt: now,
    updatedAt: now
  })

  // Build the valid rows
  const validRows: ImportedRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const record: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c] ?? ''
    }
    const parsed = tryParseRow(record, headerMap, datasetHex)
    if (parsed) validRows.push(parsed)
  }

  if (validRows.length > 0) {
    const salesRows = await salesRowsCollection()
    await salesRows.insertMany(validRows as any)
  }

  // Update the dataset row count
  await datasets.updateOne(
    { _id: datasetId },
    { $set: { rowCount: validRows.length, updatedAt: new Date().toISOString() } }
  )

  return { id: datasetHex, rowCount: validRows.length }
})
