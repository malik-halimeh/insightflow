import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPresentationSalesLines } from './presentation-data'
import {
  PRESENTATION_SAMPLE_CSV_FILE_NAME,
  buildPresentationSampleCsv,
  presentationSampleCsvDigest
} from './presentation-csv'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repositoryRoot, 'public', 'samples', PRESENTATION_SAMPLE_CSV_FILE_NAME)
const lines = buildPresentationSalesLines()
const csv = buildPresentationSampleCsv(lines)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, csv, 'utf8')

console.log(`Presentation sample CSV written to ${outputPath}`)
console.log(`Rows: ${lines.length}`)
console.log(`Digest: ${presentationSampleCsvDigest(csv)}`)
