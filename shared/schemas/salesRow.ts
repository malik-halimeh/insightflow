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
