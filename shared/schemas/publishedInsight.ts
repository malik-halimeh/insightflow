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

  /**
   * The finding this was published from. This is what makes "already published"
   * survive a refresh: the recommendations page looks up insights by this id
   * rather than remembering in the browser, and unpublishing finds the record
   * again without the owner having to.
   *
   * Nullable because insights published before this field existed have nothing to
   * point at, and because a finding can be deleted while its public page stays up.
   */
  recommendationId: idSchema.nullable(),

  /**
   * The data set the finding came from, stored directly rather than followed
   * through the recommendation. Deleting a data set promises to remove anything
   * published from it, and that promise has to hold even for an insight whose
   * recommendation has already gone.
   */
  datasetId: idSchema.nullable(),

  publishedAt: isoDateTimeSchema
})

export type PublishedInsight = z.infer<typeof publishedInsightSchema>

// hideAbsoluteNumbers may be omitted when creating a record, so the shape accepted
// as input differs from the shape that comes back out.
export type PublishedInsightInput = z.input<typeof publishedInsightSchema>

/**
 * What the owner fills in when publishing a finding.
 *
 * Everything else is derived rather than typed: the id, the slug and the
 * timestamp are assigned by the server, and the metric label, the value, the
 * business type and the data set are copied from the recommendation being
 * published. That is why `recommendationId` is required here even though it is
 * nullable on the stored record — you publish a finding, so there is always one
 * at the moment of publishing.
 *
 * Bind the publish form to this, never to `publishedInsightSchema`.
 */
export const publishedInsightCreateSchema = publishedInsightSchema
  .pick({
    displayName: true,
    caption: true,
    hideAbsoluteNumbers: true
  })
  .extend({
    recommendationId: idSchema
  })

export type PublishedInsightCreate = z.infer<typeof publishedInsightCreateSchema>
