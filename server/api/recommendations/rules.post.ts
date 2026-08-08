import { ObjectId } from 'mongodb'
import {
  ruleCreateSchema,
  ruleSchema,
  type Rule
} from '#shared/schemas'

export default defineEventHandler(async (event): Promise<Rule> => {
  const ownerId = requireOwnerId(event)

  const parsed = ruleCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message
        ?? 'Please check the rule and try again.'
    })
  }

  // The owner comes from the signed session, and `ruleCreateSchema` has no field
  // for it, so a request cannot write a rule into another account's list even by
  // sending one.
  const _id = new ObjectId()
  const rule = ruleSchema.parse({
    id: _id.toHexString(),
    ownerId,
    ...parsed.data
  })
  const { id, ...document } = rule

  await (await rulesCollection()).insertOne({
    _id: new ObjectId(id),
    ...document
  })

  setResponseStatus(event, 201)
  return rule
})
