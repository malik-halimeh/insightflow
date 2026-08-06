import { requireSession } from '../../utils/auth'

// ---------------------------------------------------------------------------
// POST /api/datasets/check
//
// Accepts a multipart upload containing a single CSV file. Reads the file
// entirely in memory (Node Buffers, no disk I/O), validates every row against
// the sales-row shape, and returns a summary + the first 200 problems so the
// owner can fix their file before the real import.
//
// The response is intentionally fast: we do zero database work here. We only
// touch MongoDB during the actual import (check.post → import.post).
// ---------------------------------------------------------------------------

interface RowProblem {
  line: number
  column: string
  value: string
  message: string
}

interface CheckResponse {
  total: number
  valid: number
  invalid: number
  problems: RowProblem[]
}

const REVENUE_TOLERANCE = 0.005

// The expected CSV header columns (case-insensitive, trimmed).
const REQUIRED_COLUMNS = ['date', 'itemname', 'quantity', 'unitprice', 'revenue']

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z]/g, '')
}

function validateRow(
  raw: Record<string, string>,
  lineNumber: number,
  headerMap: Record<string, string>
): RowProblem[] {
  const problems: RowProblem[] = []

  // Helper: get raw value by canonical column name
  const get = (canonical: string): string => {
    const header = headerMap[canonical] ?? canonical
    return (raw[header] ?? '').trim()
  }

  // date — must be YYYY-MM-DD
  const dateVal = get('date')
  if (!dateVal) {
    problems.push({ line: lineNumber, column: 'date', value: '', message: 'Use the form YYYY-MM-DD, for example 2026-06-30.' })
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    problems.push({ line: lineNumber, column: 'date', value: dateVal, message: 'Use the form YYYY-MM-DD, for example 2026-06-30.' })
  }

  // itemName — must be non-empty
  const itemNameVal = get('itemname')
  if (!itemNameVal) {
    problems.push({ line: lineNumber, column: 'itemName', value: '', message: 'Please enter the name of the item sold.' })
  }

  // quantity — positive integer
  const quantityVal = get('quantity')
  const quantity = Number(quantityVal)
  if (!quantityVal) {
    problems.push({ line: lineNumber, column: 'quantity', value: '', message: 'The quantity sold must be more than zero.' })
  } else if (!Number.isInteger(quantity)) {
    problems.push({ line: lineNumber, column: 'quantity', value: quantityVal, message: 'Quantity must be a whole number.' })
  } else if (quantity <= 0) {
    problems.push({ line: lineNumber, column: 'quantity', value: quantityVal, message: 'The quantity sold must be more than zero.' })
  }

  // unitPrice — positive number
  const unitPriceVal = get('unitprice')
  const unitPrice = Number(unitPriceVal)
  if (!unitPriceVal) {
    problems.push({ line: lineNumber, column: 'unitPrice', value: '', message: 'The price per item must be more than zero.' })
  } else if (isNaN(unitPrice) || unitPrice <= 0) {
    problems.push({ line: lineNumber, column: 'unitPrice', value: unitPriceVal, message: 'The price per item must be more than zero.' })
  }

  // revenue — positive number, must match quantity * unitPrice
  const revenueVal = get('revenue')
  const revenue = Number(revenueVal)
  if (!revenueVal) {
    problems.push({ line: lineNumber, column: 'revenue', value: '', message: 'The total for this row must be more than zero.' })
  } else if (isNaN(revenue) || revenue <= 0) {
    problems.push({ line: lineNumber, column: 'revenue', value: revenueVal, message: 'The total for this row must be more than zero.' })
  } else if (
    !isNaN(quantity) && !isNaN(unitPrice) && Number.isInteger(quantity) && unitPrice > 0 &&
    Math.abs(revenue - quantity * unitPrice) > REVENUE_TOLERANCE
  ) {
    problems.push({
      line: lineNumber,
      column: 'revenue',
      value: revenueVal,
      message: 'The total does not match the quantity multiplied by the price.'
    })
  }

  return problems
}

/**
 * Parse CSV text into rows. Handles:
 *  - quoted fields (RFC 4180)
 *  - CRLF and LF line endings
 *  - trailing newlines
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length

  while (i < len) {
    const row: string[] = []

    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        i++ // skip opening quote
        let field = ''
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"'
              i += 2
            } else {
              i++ // skip closing quote
              break
            }
          } else {
            field += text[i++]
          }
        }
        row.push(field)
      } else {
        // Unquoted field — read until comma or newline
        let field = ''
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++]
        }
        row.push(field.trim())
      }

      // After the field: comma → next field, newline → next row, end → done
      if (i < len && text[i] === ',') {
        i++
      } else {
        break
      }
    }

    // Skip CRLF or LF
    if (i < len && text[i] === '\r') i++
    if (i < len && text[i] === '\n') i++

    // Skip completely empty rows (e.g. trailing newline)
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      rows.push(row)
    }
  }

  return rows
}

export default defineEventHandler(async (event): Promise<CheckResponse> => {
  requireSession(event)

  // Read the raw multipart body
  const formData = await readFormData(event)
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Please upload a CSV file.' })
  }

  const arrayBuffer = await (file as File).arrayBuffer()
  const text = new TextDecoder('utf-8').decode(arrayBuffer)

  // Parse
  const rows = parseCsv(text)

  if (rows.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'The file is empty or has no data rows.' })
  }

  // Build a map: normalised column name → original header string
  const headers = rows[0]
  const headerMap: Record<string, string> = {}
  for (const h of headers) {
    headerMap[normaliseHeader(h)] = h
  }

  // Check required columns are present
  const missing = REQUIRED_COLUMNS.filter(c => !(c in headerMap))
  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `The CSV is missing columns: ${missing.join(', ')}. Expected: date, itemName, quantity, unitPrice, revenue.`
    })
  }

  let valid = 0
  let invalid = 0
  const problems: RowProblem[] = []

  // Data rows start at index 1 (line 2 in the file)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const lineNumber = r + 1 // 1-indexed, accounting for header

    // Build a named record from the positional row
    const record: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c] ?? ''
    }

    const rowProblems = validateRow(record, lineNumber, headerMap)
    if (rowProblems.length === 0) {
      valid++
    } else {
      invalid++
      // Cap the returned problems at 200 to keep the response small, but
      // keep counting so the summary is accurate.
      if (problems.length < 200) {
        problems.push(...rowProblems)
      }
    }
  }

  const total = valid + invalid
  return { total, valid, invalid, problems }
})
