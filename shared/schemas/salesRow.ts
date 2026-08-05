import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

const REVENUE_TOLERANCE = 0.005

// 1. Define the base object shape without .refine()
const baseSalesRowShape = {
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
}

// 2. Base Zod object for complete records
const baseSalesRowSchema = z.object(baseSalesRowShape)

// 3. Complete schema with total calculation check
export const salesRowSchema = baseSalesRowSchema.refine(
  row => Math.abs(row.revenue - row.quantity * row.unitPrice) <= REVENUE_TOLERANCE,
  {
    message: 'The total for this row does not match the quantity multiplied by the price.',
    path: ['revenue']
  }
)



// 4. Omit id/datasetId from the base object FIRST, then attach .refine()
export const salesRowIntakeSchema = baseSalesRowSchema
  .omit({
    id: true,
    datasetId: true
  })
  .refine(
    row => Math.abs(row.revenue - row.quantity * row.unitPrice) <= REVENUE_TOLERANCE,
    {
      message: 'The total for this row does not match the quantity multiplied by the price.',
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
