import { publishedInsightSchema, type PublishedInsight } from '#shared/schemas'
import { publishedInsightsCollection } from '../../utils/db'

/**
 * The public feed. No session: this is the page strangers arrive on from a link.
 *
 * Two guards, because this page failed once already and it fails in public.
 *
 * The link fields are coalesced to null, so a record written before they existed
 * reads correctly rather than as undefined.
 *
 * A record that still fails validation is skipped rather than thrown. Parsing the
 * whole list and letting one failure escape means a single malformed row returns
 * 500 to every visitor and empties the page. Skipping loses one insight; throwing
 * loses all of them.
 */
export default defineEventHandler(async (): Promise<PublishedInsight[]> => {
  const documents = await (await publishedInsightsCollection())
    .find({})
    .sort({ publishedAt: -1 })
    .toArray()

  const insights: PublishedInsight[] = []

  for (const { _id, ...document } of documents) {
    const parsed = publishedInsightSchema.safeParse({
      id: _id.toHexString(),
      ...document,
      recommendationId: document.recommendationId ?? null,
      datasetId: document.datasetId ?? null
    })

    if (parsed.success) {
      insights.push(parsed.data)
      continue
    }

    console.warn(
      `[insights] skipping unreadable published insight ${_id.toHexString()}:`,
      parsed.error.issues.map(issue => `${issue.path.join('.')} ${issue.message}`).join('; ')
    )
  }

  return insights
})
