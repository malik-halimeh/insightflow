import { ObjectId } from 'mongodb'
import { datasetCreateSchema, type Dataset } from '#shared/schemas'
import { requireOwnerId } from '../../utils/ownership'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset> => {
  const ownerId = requireOwnerId(event)

  const parsed = datasetCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    })
  }

  const now = new Date().toISOString()
  const _id = new ObjectId()

  // The server owns the id, the owner and the timestamps. A client that supplied
  // its own would be trusted to generate database keys, which it must never be,
  // and a client that supplied the owner could file a data set under someone else.
  // `ownerId` comes from the signed session and `datasetCreateSchema` has no field
  // for it, so a request cannot reach it even by sending one.
  const document = {
    _id,
    ownerId,
    ...parsed.data,
    rowCount: 0,
    currentVersionId: null,
    createdAt: now,
    updatedAt: now
  }

  await (await datasetsCollection()).insertOne(document)

  const { _id: id, ...rest } = document
  return { id: id.toHexString(), ...rest }
})
