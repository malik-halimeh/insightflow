import { ObjectId } from 'mongodb'
import { requireSession } from '../../../../../utils/auth'
import { datasetVersionsCollection, datasetsCollection } from '../../../../../utils/db'
import { rehydrateVersion, versioningEnabled } from '../../../../../utils/versioning'

/**
 * Points a data set back at an earlier upload.
 *
 * OWNER: M1, alongside the versions list beside it. The page that calls this is M2's.
 *
 * Restoring is not only a pointer move. `rowCount`, `periodStart` and `periodEnd`
 * describe the rows currently in `salesRows`, and the dashboard, the recommendations
 * and the forecast all read them — so they travel with the pointer. Moving the
 * pointer alone would have the dashboard reporting one upload's totals over
 * another's rows, which is worse than not restoring at all because it looks right.
 */
export default defineEventHandler(async (event) => {
  requireSession(event)

  if (!versioningEnabled()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Upload history is not switched on for this site.'
    })
  }

  const id = getRouterParam(event, 'id')
  const versionId = getRouterParam(event, 'versionId')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  if (!versionId || !ObjectId.isValid(versionId)) {
    throw createError({ statusCode: 400, statusMessage: 'That upload could not be found.' })
  }

  const datasets = await datasetsCollection()
  const dataset = await datasets.findOne({ _id: new ObjectId(id) })

  if (!dataset) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  // Matched on both ids, so a version belonging to a different data set reads as
  // missing rather than restoring one business's rows into another's.
  const version = await (await datasetVersionsCollection()).findOne({
    _id: new ObjectId(versionId),
    datasetId: id
  })

  if (!version) {
    throw createError({
      statusCode: 404,
      statusMessage: 'That upload is no longer available. Only the ten most recent uploads are kept.'
    })
  }

  // Already the current one. Succeeding quietly is right: the owner asked for a
  // state the data set is already in, and an error would make a sensible click
  // look like a failure.
  if (dataset.currentVersionId === versionId) {
    return {
      restored: false,
      versionNumber: version.versionNumber,
      rowCount: dataset.rowCount,
      message: 'That upload is already the one in use.'
    }
  }

  const rowCount = await rehydrateVersion(id, versionId)

  // The version record outlived its rows. `rehydrateVersion` returns 0 without
  // touching `salesRows` in that case, so the data set is still intact and this is
  // only a message — never a restore that quietly emptied it.
  if (rowCount === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The rows for that upload are no longer stored, so it cannot be restored. Nothing has been changed.'
    })
  }

  await datasets.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        currentVersionId: versionId,
        rowCount,
        periodStart: version.periodStart,
        periodEnd: version.periodEnd,
        updatedAt: new Date().toISOString()
      }
    }
  )

  return {
    restored: true,
    versionNumber: version.versionNumber,
    rowCount,
    periodStart: version.periodStart,
    periodEnd: version.periodEnd
  }
})
