import { ObjectId } from 'mongodb'
import { datasetCreateSchema, type Dataset } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { datasetsCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Dataset> => {
  requireSession(event)

  const parsed = datasetCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    })
  }

  const now = new Date().toISOString()
  const _id = new ObjectId()

  // The server owns the id and the timestamps. A client that supplied its own would
  // be trusted to generate database keys, which it must never be.
  const document = {
    _id,
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
