import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import { dimensionSchema, metricSchema } from './rule'

export const severitySchema = z.enum(['info', 'opportunity', 'warning'], {
  error: 'Please choose how important this finding is.'
})

export type Severity = z.infer<typeof severitySchema>

export const recommendationSchema = z.object({
  id: idSchema,
  datasetId: idSchema,
  // Null when a finding did not come from a saved rule.
  ruleId: idSchema.nullable(),
  title: z.string().min(1, 'Please enter a short headline for this finding.'),
  body: z.string().min(1, 'Please explain what this finding means.'),
  // A full sentence an owner could act on today — "Optimise Tuesday" is not an
  // action, "Move one member of staff off Tuesday" is. Was previously missing
  // from this schema (recommendations/index.vue was built against demo data
  // only); added so the recommendation is fully persisted and round-trips
  // through the API rather than being invented client-side.
  action: z.string().min(1, 'Please write a concrete next step for this finding.'),
  // Reuses the rule vocabulary: every finding is produced against one of these.
  metric: metricSchema,
  dimension: dimensionSchema,
  // Negative values describe a fall, so this is not restricted to positive numbers.
  changePercent: z.number({ error: 'Please enter the change as a number, for example 12.5.' }),
  severity: severitySchema,
  createdAt: isoDateTimeSchema
})

export type Recommendation = z.infer<typeof recommendationSchema>
