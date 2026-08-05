// shared/schemas/salesRow.ts
import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

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
      message: 'The total for this row does not match the quantity multiplied by the price.',
      path: ['revenue']
    }
  )

export type SalesRow = z.infer<typeof salesRowSchema>

/**
 * Intake schema used for validating raw CSV rows before database insertion.
 */
export const salesRowIntakeSchema = salesRowSchema.omit({
  id: true,
  datasetId: true
})

export type SalesRowIntake = z.infer<typeof salesRowIntakeSchema>