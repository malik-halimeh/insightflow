import { type Dataset } from '#shared/schemas'
import { requireOwnerId } from '../../utils/ownership'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset[]> => {
  // Filtered by the signed-in account, not merely gated behind a session. Before
  // this filter existed, any approved owner listing their data sets was handed
  // every other business's as well.
  const ownerId = requireOwnerId(event)

  const documents = await (await datasetsCollection())
    .find({ ownerId })
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, ...rest }) => ({ id: _id.toHexString(), ...rest }))
})
