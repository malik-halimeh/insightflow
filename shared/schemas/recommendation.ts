import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import {
  dimensionSchema,
  expectedDirectionSchema,
  metricSchema,
  ruleOperatorSchema
} from './rule'

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

  /**
   * What the owner should actually do about it, as a sentence they could act on
   * today. "Move one member of staff off Tuesday" is an action. "Optimise
   * Tuesday" is not.
   *
   * Separate from `body` on purpose: the body explains what was found, the action
   * says what to do. Plain-language advice is the point of the product, so every
   * finding carries one and this is not optional.
   */
  action: z.string().min(1, 'Please say what the owner should do about this.'),
  // Reuses the rule vocabulary: every finding is produced against one of these.
  metric: metricSchema,
  dimension: dimensionSchema,
  // Optional while recommendations written before this contract still exist.
  dimensionValue: z.string().min(1).nullable().optional(),
  operator: ruleOperatorSchema.nullable().optional(),
  /** Frozen from the rule so later edits cannot change how this finding is measured. */
  expectedDirection: expectedDirectionSchema.nullable().optional(),
  // Negative values describe a fall, so this is not restricted to positive numbers.
  changePercent: z.number({ error: 'Please enter the change as a number, for example 12.5.' }),
  severity: severitySchema,
  createdAt: isoDateTimeSchema
})

export type Recommendation = z.infer<typeof recommendationSchema>
