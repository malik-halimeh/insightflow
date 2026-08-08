import { z } from 'zod'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'

// All three types are accepted so stored records stay valid as the product grows.
// Phase 1 only ever creates restaurant data sets.
export const businessTypeSchema = z.enum(['restaurant', 'retail', 'gym'], {
  error: 'Please choose whether this is a restaurant, a shop or a gym.'
})

export type BusinessType = z.infer<typeof businessTypeSchema>

export const datasetSchema = z.object({
  id: idSchema,

  /**
   * The account this data set belongs to, and the root of every access decision
   * in the product. Sales rows, recommendations, published insights and upload
   * history are all reached through a data set, so this one field scopes them all.
   *
   * Assigned by the server from the session, never sent by a browser, which is why
   * `datasetCreateSchema` below does not include it.
   */
  ownerId: idSchema,

  name: z.string().min(3, 'Please give this data set a name of at least 3 characters.'),
  businessType: businessTypeSchema,
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  rowCount: z
    .number()
    .int('The number of rows must be a whole number.')
    .nonnegative('The number of rows cannot be negative.'),
  currentVersionId: idSchema.nullable(),
  notes: z.string().max(500, 'Please keep notes to 500 characters or fewer.').optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
})

export type Dataset = z.infer<typeof datasetSchema>

/**
 * What the owner actually fills in when creating a data set. The id, owner,
 * timestamps, row count and current version are assigned by the server, so a form
 * must never send them and must never be built against `datasetSchema`.
 *
 * `ownerId` is the important omission. A browser that could send it could claim a
 * data set for another account, so it is taken from the signed session instead and
 * there is deliberately nowhere on this schema to put it.
 */
export const datasetCreateSchema = datasetSchema
  .pick({
    name: true,
    businessType: true,
    periodStart: true,
    periodEnd: true,
    notes: true
  })
  .refine(value => value.periodEnd >= value.periodStart, {
    error: 'The end date cannot be before the start date.',
    path: ['periodEnd']
  })

export type DatasetCreate = z.infer<typeof datasetCreateSchema>
