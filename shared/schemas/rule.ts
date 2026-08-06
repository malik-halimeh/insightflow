import { z } from 'zod'
import { idSchema } from './common'

export const metricSchema = z.enum(['revenue', 'quantity', 'orders'], {
  error: 'Please choose whether this rule looks at revenue, quantity or orders.'
})

export const dimensionSchema = z.enum(['dayOfWeek', 'item', 'category', 'hour'], {
  error: 'Please choose whether this rule groups by day of week, item, category or hour.'
})

export const ruleOperatorSchema = z.enum(
  ['above_average_by', 'below_average_by', 'unsold_for_days'],
  { error: 'Please choose how this rule should compare the numbers.' }
)

export type Metric = z.infer<typeof metricSchema>
export type Dimension = z.infer<typeof dimensionSchema>
export type RuleOperator = z.infer<typeof ruleOperatorSchema>

export const ruleSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Please give this rule a name.'),
  metric: metricSchema,
  dimension: dimensionSchema,
  operator: ruleOperatorSchema,
  threshold: z.number().positive('The threshold must be more than zero.'),
  advice: z.string().min(10, 'Please write at least 10 characters of advice.'),
  enabled: z.boolean()
})

export type Rule = z.infer<typeof ruleSchema>

/**
 * What the owner fills in when writing a rule. Only the id is missing: the server
 * assigns it, and a browser must never generate a database key.
 *
 * Bind the rule form to this, not to `ruleSchema`. A form bound to the record
 * schema cannot submit, because it has no field for the id and so nowhere to show
 * the error.
 */
export const ruleCreateSchema = ruleSchema.omit({ id: true })

export type RuleCreate = z.infer<typeof ruleCreateSchema>
