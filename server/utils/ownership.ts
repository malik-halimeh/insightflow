import { ObjectId } from 'mongodb'
import { createError, type H3Event } from 'h3'
import { requireSession } from './auth'
import { datasetsCollection, type DatasetDoc } from './db'

/**
 * Per-owner scoping, in one place.
 *
 * Every owned record in this product hangs off a data set, so a data set is the
 * only thing whose ownership has to be checked. Sales rows, recommendations,
 * published insights and upload history are all reached through one, and a route
 * that has proved the data set belongs to the caller has proved the rest.
 *
 * Rules are the exception: they belong to an owner directly, not to a data set,
 * so they carry `ownerId` themselves and routes filter on `requireOwnerId`.
 *
 * WHY 404 AND NOT 403
 * Asking for someone else's data set answers exactly as if it did not exist. A 403
 * would confirm that the id is real, which is a way of enumerating other people's
 * data one id at a time. The owner never sees this either way: nothing in the
 * interface links to a data set they do not own.
 */

/** The signed-in account's id. Every owned query is filtered by this. */
export function requireOwnerId(event: H3Event): string {
  return requireSession(event).userId
}

/**
 * The data set at `id`, if the caller owns it. Throws otherwise, with the same
 * message whether it is missing or someone else's.
 *
 * Returns the document so the caller does not fetch it twice: every route that
 * needs the ownership check also needs the data set.
 */
export async function requireOwnedDataset(
  event: H3Event,
  id: string | undefined
): Promise<DatasetDoc> {
  const ownerId = requireOwnerId(event)

  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'That data set could not be found.' })
  }

  // Both conditions in one query rather than a fetch then a compare, so there is
  // no window where the check and the read disagree, and no path where a route
  // forgets the second half.
  const dataset = await (await datasetsCollection()).findOne({
    _id: new ObjectId(id),
    ownerId
  })

  if (!dataset) {
    throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
  }

  return dataset
}

/**
 * The ids of every data set the caller owns, for the routes that filter a child
 * collection directly rather than working from one data set.
 *
 * Returns an empty array for an owner with no data sets, which is a real state on
 * a new account. Callers must treat `{ datasetId: { $in: [] } }` as "match
 * nothing", which is what MongoDB does.
 */
export async function ownedDatasetIds(event: H3Event): Promise<string[]> {
  const ownerId = requireOwnerId(event)

  const documents = await (await datasetsCollection())
    .find({ ownerId }, { projection: { _id: 1 } })
    .toArray()

  return documents.map(document => document._id.toHexString())
}
