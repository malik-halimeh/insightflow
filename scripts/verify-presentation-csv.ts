import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSalesRows } from '../server/utils/csv'
import {
  PRESENTATION_PERIOD_END,
  PRESENTATION_PERIOD_START,
  buildPresentationSalesLines
} from './presentation-data'
import {
  PRESENTATION_SAMPLE_CSV_FILE_NAME,
  PRESENTATION_SAMPLE_CSV_HEADER,
  buildPresentationSampleCsv,
  presentationSampleCsvDigest
} from './presentation-csv'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const csvPath = resolve(repositoryRoot, 'public', 'samples', PRESENTATION_SAMPLE_CSV_FILE_NAME)
const sourceLines = buildPresentationSalesLines()
const expectedCsv = buildPresentationSampleCsv(sourceLines)
const actualCsv = await readFile(csvPath, 'utf8')

check(actualCsv === expectedCsv, 'The committed sample CSV does not match the deterministic generator.')
check(
  actualCsv.startsWith(`${PRESENTATION_SAMPLE_CSV_HEADER.join(',')}\n`),
  'The sample CSV header changed.'
)

const { rows, report } = readSalesRows(actualCsv)
check(report.total === sourceLines.length, `Expected ${sourceLines.length} rows, received ${report.total}.`)
check(report.valid === sourceLines.length, `Only ${report.valid} of ${sourceLines.length} rows passed the upload parser.`)
check(report.invalid === 0 && report.problems.length === 0, 'The sample CSV contains invalid upload rows.')
check(report.periodStart === PRESENTATION_PERIOD_START, `Unexpected first date: ${report.periodStart}.`)
check(report.periodEnd === PRESENTATION_PERIOD_END, `Unexpected last date: ${report.periodEnd}.`)

const expectedRows = sourceLines.map(({ row }) => ({
  date: row.date,
  itemName: row.itemName,
  ...(row.category ? { category: row.category } : {}),
  quantity: row.quantity,
  unitPrice: row.unitPrice,
  revenue: row.revenue
}))

check(
  JSON.stringify(rows) === JSON.stringify(expectedRows),
  'The upload parser did not reproduce the generated presentation rows exactly.'
)

console.log('Presentation sample CSV verification passed.')
console.log(`Rows: ${report.valid}`)
console.log(`Invalid: ${report.invalid}`)
console.log(`Period: ${report.periodStart} to ${report.periodEnd}`)
console.log(`Digest: ${presentationSampleCsvDigest(actualCsv)}`)
