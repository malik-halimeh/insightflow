import { requireOwnedDataset } from '../../utils/ownership'
import {
  datasetVersionRowsCollection,
  datasetVersionsCollection,
  datasetsCollection,
  publishedInsightsCollection,
  outcomesCollection,
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
  // Ownership before anything is deleted. This is the most destructive route in
  // the product, so it is also the one where a missing check costs the most: it
  // would let any signed-in account destroy another business's entire history.
  const existing = await requireOwnedDataset(event, getRouterParam(event, 'id'))
  const id = existing._id.toHexString()
  const datasets = await datasetsCollection()

  /*
    The archive goes too, and it goes first.

    Upload history holds a full copy of every past upload's rows, so a data set
    deleted without this leaves behind more rows than it did in `salesRows`. They
    would be unreachable, permanent, and invisible to the owner who was told the
    data was gone.

    Archived rows before version records, for the same reason the two are ordered
    that way in `pruneVersions`: rows whose version is gone are invisible and
    harmless, where a version whose rows are gone is a history entry an owner can
    see and click restore on with nothing behind it.

    Ungated on purpose. The flag decides whether new history is written, never
    whether history already on disk is cleaned up, so switching the feature off
    must not start leaking archives.
  */
  await (await datasetVersionRowsCollection()).deleteMany({ datasetId: id })
  const versions = await (await datasetVersionsCollection()).deleteMany({ datasetId: id })

  // Foreign keys are stored as hex strings, not ObjectIds.
  const [rows, recommendations, insights, outcomes] = await Promise.all([
    (await salesRowsCollection()).deleteMany({ datasetId: id }),
    (await recommendationsCollection()).deleteMany({ datasetId: id }),
    // Outcomes go with the recommendations they measure. An outcome whose
    // recommendation is gone can never be read again and would still be counted
    // by any scoreboard that queried the collection directly.
    (await outcomesCollection()).deleteMany({ datasetId: id }),
    // The confirmation promises that anything published from this data set comes
    // down, including its public link. Without this the page stays live on the
    // open internet after the data behind it is gone.
    (await publishedInsightsCollection()).deleteMany({ datasetId: id })
  ])

  await datasets.deleteOne({ _id: existing._id })

  return {
    deleted: {
      dataset: existing.name,
      salesRows: rows.deletedCount,
      recommendations: recommendations.deletedCount,
      publishedInsights: insights.deletedCount,
      outcomes: outcomes.deletedCount,
      uploadHistory: versions.deletedCount
    }
  }
})
