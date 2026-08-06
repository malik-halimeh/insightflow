import { ObjectId } from 'mongodb'
import { recommendationSchema, type Recommendation } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { recommendationsCollection } from '../../utils/db'

const createRecommendationSchema = recommendationSchema.omit({ id: true })

export default defineEventHandler(async (event): Promise<Recommendation> => {
  requireSession(event)

  const parsed = createRecommendationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the recommendation details.'
    })
  }

  const _id = new ObjectId()
  const recommendations = await recommendationsCollection()
  await recommendations.insertOne({ _id, ...parsed.data })

  return recommendationSchema.parse({ id: _id.toHexString(), ...parsed.data })
})
