import { datasetCreateSchema, type Dataset } from '#shared/schemas'
import { requireOwnedDataset } from '../../utils/ownership'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset> => {
  // Ownership is proved before the body is even read, so a request for another
  // account's data set is refused without the edit being validated or applied.
  const existing = await requireOwnedDataset(event, getRouterParam(event, 'id'))

  // datasetCreateSchema, not datasetSchema. The record schema also demands the id,
  // the owner, the row count and the timestamps, none of which the edit form sends
  // and none of which a browser is allowed to set — so validating against it
  // rejects every real edit, and the owner sees a form that does nothing when they
  // press save.
  const parsed = datasetCreateSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    })
  }

  const result = await (await datasetsCollection()).findOneAndUpdate(
    // Matched on the owner as well as the id. Belt and braces next to the check
    // above, and it closes the window between the two.
    { _id: existing._id, ownerId: existing.ownerId },
    {
      // Only the fields the owner typed. Spreading a whole record here would let a
      // request overwrite the row count, the created date or the owner.
      $set: {
        ...parsed.data,
        updatedAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  )

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'That data set could not be found.'
    })
  }

  const { _id, ...rest } = result

  return {
    id: _id.toHexString(),
    ...rest
  }
})
