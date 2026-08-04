import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

// Money arrives as floating point, so an exact equality check on
// quantity * unitPrice would reject correct rows such as 3 * 0.1. Half a penny
// of tolerance accepts real arithmetic while still catching a wrong total.
const REVENUE_TOLERANCE = 0.005

export const salesRowSchema = z
  .object({
    id: idSchema,
    datasetId: idSchema,
    date: isoDateSchema,
    itemName: z.string().min(1, 'Please enter the name of the item sold.'),
    category: z.string().min(1, 'Please enter a category, or leave it blank.').optional(),
    quantity: z
      .number()
      .int('The quantity sold must be a whole number.')
      .positive('The quantity sold must be more than zero.'),
    unitPrice: z.number().positive('The price per item must be more than zero.'),
    revenue: z.number().positive('The total for this row must be more than zero.')
  })
  .refine(
    row => Math.abs(row.revenue - row.quantity * row.unitPrice) <= REVENUE_TOLERANCE,
    {
      error: 'The total for this row does not match the quantity multiplied by the price.',
      path: ['revenue']
    }
  )

export type SalesRow = z.infer<typeof salesRowSchema>

/**
 * One row as it arrives from a spreadsheet. The id and the data set are assigned
 * by the server when the file is imported, so the file never supplies them.
 *
 * `revenue` is optional here, unlike on the stored record. Plenty of till exports
 * list the quantity and the price but no total, and rejecting those files would be
 * pedantry rather than validation — the server works the total out. When the file
 * does give a total it must agree with the arithmetic, which is how a mistyped
 * figure gets caught instead of quietly becoming the truth.
 */
export const salesRowCreateSchema = z
  .object({
    date: isoDateSchema,
    itemName: z.string().min(1, 'Please enter the name of the item sold.'),
    category: z.string().min(1, 'Please enter a category, or leave it blank.').optional(),
    quantity: z
      .number()
      .int('The quantity sold must be a whole number.')
      .positive('The quantity sold must be more than zero.'),
    unitPrice: z.number().positive('The price per item must be more than zero.'),
    revenue: z.number().positive('The total for this row must be more than zero.').optional()
  })
  .refine(
    row => row.revenue === undefined
      || Math.abs(row.revenue - row.quantity * row.unitPrice) <= REVENUE_TOLERANCE,
    {
      error: 'The total for this row does not match the quantity multiplied by the price.',
      path: ['revenue']
    }
  )

export type SalesRowCreate = z.infer<typeof salesRowCreateSchema>
