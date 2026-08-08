import { type Dataset } from '#shared/schemas'
import { requireOwnedDataset } from '../../utils/ownership'

export default defineEventHandler(async (event): Promise<Dataset> => {
  // Use the shared helper rather than repeating the cookie check in every route.
  // Written out by hand, a change to how sessions work has to be found in a dozen
  // files, and the message an owner sees drifts from route to route.
  //
  // `requireOwnedDataset` does the session check, the id check and the ownership
  // check in one query, and answers a data set belonging to another account
  // exactly as it answers one that does not exist.
  const document = await requireOwnedDataset(event, getRouterParam(event, 'id'))

  const { _id, ...rest } = document

  return {
    id: _id.toHexString(),
    ...rest
  }
})
