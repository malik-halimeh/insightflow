import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import { businessTypeSchema } from './dataset'

// Lowercase words joined by single hyphens, e.g. "quiet-tuesday-evenings".
// Uniqueness cannot be checked here; it is enforced by a unique index in the database.
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Please use lowercase letters, numbers and single hyphens only.'
  )

export const publishedInsightSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  displayName: z
    .string()
    .min(2, 'Please enter a name of at least 2 characters.')
    .max(40, 'Please keep the name to 40 characters or fewer.'),
  caption: z
    .string()
    .min(10, 'Please write a caption of at least 10 characters.')
    .max(280, 'Please keep the caption to 280 characters or fewer.'),
  metricLabel: z.string().min(1, 'Please say what this number measures.'),
  metricValue: z.number({ error: 'Please enter this measurement as a number.' }),
  // Defaults to hiding real figures so publishing never exposes takings by accident.
  hideAbsoluteNumbers: z.boolean().default(true),
  businessType: businessTypeSchema,
  publishedAt: isoDateTimeSchema
})

export type PublishedInsight = z.infer<typeof publishedInsightSchema>

// hideAbsoluteNumbers may be omitted when creating a record, so the shape accepted
// as input differs from the shape that comes back out.
export type PublishedInsightInput = z.input<typeof publishedInsightSchema>
