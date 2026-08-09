import { z } from 'zod'
import { businessTypeSchema } from './dataset'
import { dimensionSchema, metricSchema, ruleOperatorSchema } from './rule'

export const benchmarkSchema = z.object({
  businessType: businessTypeSchema,
  metric: metricSchema,
  dimension: dimensionSchema,
  dimensionValue: z.string().min(1, 'Please say which group this benchmark represents.'),
  operator: ruleOperatorSchema,
  aggregateValue: z.number({ error: 'Please provide the benchmark as a number.' }),
  contributorCount: z
    .number()
    .int('The number of contributors must be a whole number.')
    .nonnegative('The number of contributors cannot be negative.')
})

// Privacy suppression belongs in the endpoint, so internal calculations with
// fewer than five contributors can still be represented and then withheld.
export type Benchmark = z.infer<typeof benchmarkSchema>
