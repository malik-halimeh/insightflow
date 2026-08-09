import { createHash } from 'node:crypto'
import {
  buildPresentationSalesLines,
  type PresentationSalesLine
} from './presentation-data'

export const PRESENTATION_SAMPLE_CSV_FILE_NAME = 'insightflow-sales-sample.csv' as const
export const PRESENTATION_SAMPLE_CSV_HEADER = [
  'Date',
  'Item',
  'Category',
  'Quantity',
  'Unit Price',
  'Revenue'
] as const

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildPresentationSampleCsv(
  lines: PresentationSalesLine[] = buildPresentationSalesLines()
): string {
  const rows = lines.map(({ row }) => [
    row.date,
    row.itemName,
    row.category ?? '',
    row.quantity,
    row.unitPrice.toFixed(2),
    row.revenue.toFixed(2)
  ].map(csvCell).join(','))

  return `${PRESENTATION_SAMPLE_CSV_HEADER.join(',')}\n${rows.join('\n')}\n`
}

export function presentationSampleCsvDigest(csv = buildPresentationSampleCsv()): string {
  return createHash('sha256').update(csv).digest('hex')
}
