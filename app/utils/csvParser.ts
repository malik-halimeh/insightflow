import Papa from 'papaparse'
import { salesRowIntakeSchema, type SalesRowIntake } from '#shared/schemas/salesRow'

export interface RowError {
  line: number
  messages: string[]
}

export interface CsvParseResult {
  validRows: SalesRowIntake[]
  errors: RowError[]
}

export function parseAndValidateCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validRows: SalesRowIntake[] = []
        const errors: RowError[] = []

        results.data.forEach((row, index) => {
          // Line 1 is the CSV header row; data starts on Line 2
          const lineNumber = index + 2

          // Normalize values and parse numbers safely
          const rawCategory = row['category'] || row['Category']
          const candidate = {
            date: (row['date'] || row['Date'] || '').trim(),
            itemName: (row['item'] || row['Item'] || row['itemName'] || '').trim(),
            category: rawCategory && rawCategory.trim() !== '' ? rawCategory.trim() : undefined,
            quantity: Number(row['sold'] || row['Sold'] || row['quantity'] || NaN),
            unitPrice: Number(row['price'] || row['Price'] || row['unitPrice'] || NaN),
            revenue: Number(row['total'] || row['Total'] || row['revenue'] || NaN)
          }

          const result = salesRowIntakeSchema.safeParse(candidate)

          if (result.success) {
            validRows.push(result.data)
          } else {
            errors.push({
              line: lineNumber,
              messages: result.error.issues.map(issue => issue.message)
            })
          }
        })

        resolve({ validRows, errors })
      },
      error: (err) => reject(err)
    })
  })
}