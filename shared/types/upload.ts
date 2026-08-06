/**
 * What the server reports back after reading a spreadsheet.
 *
 * The shape is built around one decision: a file is never all-or-nothing. Six bad
 * lines in two hundred should not throw away the other one hundred and ninety
 * four, so the report always carries both halves — what can be imported, and
 * exactly what cannot, with the line number to look at.
 */

export interface RowProblem {
  /** Line number in the file the owner opened, counting the header as line 1. */
  line: number
  /** The column at fault, named as it appears in their file where possible. */
  column: string
  /** What the file actually said. Empty string when the cell was blank. */
  value: string
  /** Written for the owner, not the developer. */
  message: string
}

export interface UploadReport {
  /** Data rows found, excluding the header. */
  total: number
  /** Rows that passed every check and are ready to import. */
  valid: number
  /** Rows that need fixing. Always equals problems.length. */
  invalid: number
  /** Every rejected row, in file order. */
  problems: RowProblem[]
  /** Earliest and latest dates among the valid rows, for the data set period. */
  periodStart: string | null
  periodEnd: string | null
  /** Set once rows have actually been written. Absent on a preview. */
  imported?: number
}
