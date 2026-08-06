import { ObjectId } from 'mongodb'
import { ruleSchema, idSchema, type Rule } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { rulesCollection } from '../../utils/db'

const patchRuleSchema = ruleSchema.omit({ id: true }).partial()

export default defineEventHandler(async (event): Promise<Rule> => {
  requireSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !idSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid rule ID.' })
  }

  const parsed = patchRuleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the rule details and try again.'
    })
  }

  const rules = await rulesCollection()
  const result = await rules.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: parsed.data },
    { returnDocument: 'after' }
  )

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'That rule could not be found.' })
  }

  const { _id, ...rest } = result
  return ruleSchema.parse({ id: _id.toHexString(), ...rest })
})
