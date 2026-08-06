import { salesRowCreateSchema, type SalesRowCreate } from '#shared/schemas'
import type { RowProblem, UploadReport } from '#shared/types/upload'

/**
 * Reads a spreadsheet export into sales rows.
 *
 * Written for files that came out of a till, not files written by a programmer.
 * That means quoted fields containing commas, a byte-order mark from Excel,
 * Windows line endings, blank trailing lines, currency symbols in the price
 * column, and column headings that vary from one till to the next.
 *
 * Nothing here throws on a bad row. A single malformed line must never cost the
 * owner the rest of the file, so every failure becomes a reported problem with
 * the line number they can open and fix.
 */

/** One pass, character by character, because quoted fields can contain commas and newlines. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is an escaped quote.
        if (clean[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)

  // Drop trailing blank lines, which almost every export ends with.
  return rows.filter(cells => cells.some(value => value.trim() !== ''))
}

/**
 * Tills disagree about column names. These are the ones seen in practice, so a
 * file does not get rejected wholesale over a heading.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['date', 'day', 'saledate', 'transactiondate', 'datetime'],
  itemName: ['itemname', 'item', 'product', 'productname', 'description', 'name'],
  category: ['category', 'type', 'group', 'department'],
  quantity: ['quantity', 'qty', 'units', 'unitssold', 'count', 'sold'],
  unitPrice: ['unitprice', 'price', 'priceperitem', 'unitcost', 'each'],
  revenue: ['revenue', 'total', 'linetotal', 'amount', 'gross', 'value']
}

function normalise(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Maps our field names onto the column positions in this particular file. */
function mapColumns(header: string[]): Partial<Record<keyof typeof COLUMN_ALIASES, number>> {
  const found: Partial<Record<string, number>> = {}

  header.forEach((heading, index) => {
    const key = normalise(heading)
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (found[field] === undefined && aliases.includes(key)) {
        found[field] = index
      }
    }
  })

  return found
}

/** Accepts "£12.50", "1,234.00" and " 12.5 ". Returns null when it is not a number at all. */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export interface ReadResult {
  rows: SalesRowCreate[]
  report: UploadReport
}

export function readSalesRows(text: string): ReadResult {
  const table = parseCsv(text)
  const problems: RowProblem[] = []
  const rows: SalesRowCreate[] = []

  if (table.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'That file is empty. Export your sales again and check the file has rows in it.'
    })
  }

  const header = table[0]!
  const columns = mapColumns(header)

  const required: Array<[string, string]> = [
    ['date', 'a date'],
    ['itemName', 'the item name'],
    ['quantity', 'the quantity sold'],
    ['unitPrice', 'the price per item']
  ]

  const missing = required.filter(([field]) => columns[field] === undefined)

  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `This file has no column for ${missing.map(([, label]) => label).join(', ')}. The first row of the file should name each column.`
    })
  }

  for (let index = 1; index < table.length; index++) {
    const cells = table[index]!
    // The owner counts the header as line 1, so their line numbers start at 2.
    const line = index + 1
    const cell = (field: string) => (columns[field] === undefined ? '' : (cells[columns[field]!] ?? '').trim())

    const quantityRaw = cell('quantity')
    const unitPriceRaw = cell('unitPrice')
    const revenueRaw = cell('revenue')

    const quantity = toNumber(quantityRaw)
    const unitPrice = toNumber(unitPriceRaw)
    const revenue = revenueRaw === '' ? undefined : toNumber(revenueRaw)

    // Catch "not a number at all" here, so the schema reports on values rather
    // than on the word NaN.
    if (quantity === null) {
      problems.push({ line, column: 'quantity', value: quantityRaw, message: 'The quantity sold must be a number.' })
      continue
    }
    if (unitPrice === null) {
      problems.push({ line, column: 'unitPrice', value: unitPriceRaw, message: 'The price per item must be a number.' })
      continue
    }
    if (revenueRaw !== '' && revenue === null) {
      problems.push({ line, column: 'revenue', value: revenueRaw, message: 'The total for this row must be a number.' })
      continue
    }

    const category = cell('category')

    const candidate = {
      date: cell('date'),
      itemName: cell('itemName'),
      ...(category === '' ? {} : { category }),
      quantity,
      unitPrice,
      ...(revenue === undefined ? {} : { revenue })
    }

    const parsed = salesRowCreateSchema.safeParse(candidate)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]!
      const column = String(issue.path[0] ?? 'row')
      problems.push({
        line,
        column,
        value: cell(column),
        message: issue.message
      })
      continue
    }

    rows.push(parsed.data)
  }

  const dates = rows.map(row => row.date).sort((a, b) => a.localeCompare(b))

  return {
    rows,
    report: {
      total: table.length - 1,
      valid: rows.length,
      invalid: problems.length,
      problems,
      periodStart: dates[0] ?? null,
      periodEnd: dates[dates.length - 1] ?? null
    }
  }
}

/** Fills in the total when the file did not carry one. */
export function withRevenue(row: SalesRowCreate): SalesRowCreate & { revenue: number } {
  return { ...row, revenue: row.revenue ?? round2(row.quantity * row.unitPrice) }
}
