import { z } from 'zod'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'

/**
 * One upload of one data set, kept for ever — or until the ten-version cap drops it.
 *
 * A version is a *record of* an upload, not the rows themselves. The rows of the
 * current version live in `salesRows`, exactly as they always have, and the rows of
 * older versions are archived separately. That split is deliberate: every query in
 * the product filters `salesRows` by `datasetId` alone, so putting several versions
 * in there at once would silently add one version's revenue to another's.
 */

/**
 * What was wrong with the file, beyond the rows the importer already rejected.
 *
 * These warn, they never block. An owner whose export has a missing Tuesday still
 * needs their dashboard; they just need to know the Tuesday is missing before they
 * read a weekly pattern into it.
 */
export const datasetQualitySchema = z.object({
  /** Calendar days inside the period with no sales row at all. */
  missingDays: z
    .number()
    .int('The number of missing days must be a whole number.')
    .nonnegative('The number of missing days cannot be negative.'),
  /** Rows repeating an existing date, item and price — usually a file uploaded twice. */
  duplicateRows: z
    .number()
    .int('The number of duplicate rows must be a whole number.')
    .nonnegative('The number of duplicate rows cannot be negative.'),
  /**
   * True when there is too little history to read a weekly pattern from. The
   * dashboard and the forecast both hide comparisons when this is set, rather than
   * drawing a confident line through a fortnight of noise.
   */
  thin: z.boolean()
})

export type DatasetQuality = z.infer<typeof datasetQualitySchema>

export const datasetVersionSchema = z.object({
  id: idSchema,
  datasetId: idSchema,

  /**
   * 1 for the first upload, counting up. The owner sees "version 3", not a hex id,
   * and the number has to survive the cap dropping version 1 — so it is stored,
   * never derived from how many versions happen to be left.
   */
  versionNumber: z
    .number()
    .int('The version number must be a whole number.')
    .positive('The version number must be 1 or more.'),

  /**
   * The import report, as it was at the time. `rowCount` is what actually landed;
   * `rejectedCount` is what the file lost on the way in. Both are frozen here
   * because they describe that upload, and re-deriving them later from rows that
   * have since been replaced would answer a different question.
   */
  rowCount: z
    .number()
    .int('The number of rows must be a whole number.')
    .nonnegative('The number of rows cannot be negative.'),
  rejectedCount: z
    .number()
    .int('The number of rejected rows must be a whole number.')
    .nonnegative('The number of rejected rows cannot be negative.'),

  /** Taken from the rows that imported, not from the dates the owner typed. */
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,

  quality: datasetQualitySchema,

  createdAt: isoDateTimeSchema
})

export type DatasetVersion = z.infer<typeof datasetVersionSchema>
