import { ObjectId } from 'mongodb'
import {
  idSchema,
  ruleCreateSchema,
  ruleSchema,
  type Rule
} from '#shared/schemas'

export default defineEventHandler(async (event): Promise<Rule> => {
  const ownerId = requireOwnerId(event)

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedId.error.issues[0]?.message
        ?? 'This rule could not be identified.'
    })
  }

  const parsed = ruleCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message
        ?? 'Please check the rule and try again.'
    })
  }

  // Matched on the owner as well as the id, so another account's rule reads as
  // missing rather than being silently rewritten. `$set` carries only the fields
  // the form sends, so the edit cannot reassign the owner.
  const document = await (await rulesCollection()).findOneAndUpdate(
    { _id: new ObjectId(parsedId.data), ownerId },
    { $set: parsed.data },
    { returnDocument: 'after' }
  )

  if (!document) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This rule could not be found.'
    })
  }

  const { _id, ...rule } = document
  return ruleSchema.parse({
    id: _id.toHexString(),
    ...rule
  })
})
