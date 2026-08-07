import { z } from 'zod'

export const benchmarkSchema = z.object({
  metric: z.string().min(1, 'Please say what this benchmark measures.'),
  dimension: z.string().min(1, 'Please say how this benchmark is grouped.'),
  aggregateValue: z.number({ error: 'Please provide the benchmark as a number.' }),
  contributorCount: z
    .number()
    .int('The number of contributors must be a whole number.')
    .nonnegative('The number of contributors cannot be negative.')
})

// Privacy suppression belongs in the endpoint, so internal calculations with
// fewer than five contributors can still be represented and then withheld.
export type Benchmark = z.infer<typeof benchmarkSchema>
