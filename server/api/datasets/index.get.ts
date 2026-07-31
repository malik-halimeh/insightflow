import { type Dataset } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset[]> => {
  requireSession(event)

  const documents = await (await datasetsCollection())
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, ...rest }) => ({ id: _id.toHexString(), ...rest }))
})
