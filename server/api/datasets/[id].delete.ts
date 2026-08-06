import { ObjectId } from 'mongodb'
import { requireSession } from '../../utils/auth'
import {
  datasetsCollection,
  publishedInsightsCollection,
  recommendationsCollection,
  salesRowsCollection
} from '../../utils/db'

/**
 * Deleting a data set deletes everything derived from it.
 *
 * MongoDB enforces no referential integrity, so this handler is the only place
 * that can. Removing the data set on its own would leave its sales rows and
 * findings behind for ever: invisible in the interface, impossible to reach, and
 * still occupying the database. The confirmation the owner clicks names those
 * rows explicitly, so leaving them would also make the product a liar.
 *
 * Order matters. The children go first, so a failure halfway through leaves a
 * data set with missing rows — visibly wrong, and repairable by re-uploading —
 * rather than orphaned rows belonging to nothing, which nobody can find again.
 */
export default defineEventHandler(async (event) => {
  requireSession(event)

  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  const datasets = await datasetsCollection()
  const existing = await datasets.findOne({ _id: new ObjectId(id) })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  // Foreign keys are stored as hex strings, not ObjectIds.
  const [rows, recommendations, insights] = await Promise.all([
    (await salesRowsCollection()).deleteMany({ datasetId: id }),
    (await recommendationsCollection()).deleteMany({ datasetId: id }),
    // The confirmation promises that anything published from this data set comes
    // down, including its public link. Without this the page stays live on the
    // open internet after the data behind it is gone.
    (await publishedInsightsCollection()).deleteMany({ datasetId: id })
  ])

  await datasets.deleteOne({ _id: new ObjectId(id) })

  return {
    deleted: {
      dataset: existing.name,
      salesRows: rows.deletedCount,
      recommendations: recommendations.deletedCount,
      publishedInsights: insights.deletedCount
    }
  }
})
