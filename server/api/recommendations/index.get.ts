import { recommendationSchema, type Recommendation } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { recommendationsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Recommendation[]> => {
  requireSession(event)

  const recommendations = await recommendationsCollection()
  const documents = await recommendations
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(({ _id, ...rest }) =>
    recommendationSchema.parse({ id: _id.toHexString(), ...rest })
  )
})
