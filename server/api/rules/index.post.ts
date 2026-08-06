import { ObjectId } from 'mongodb'
import { ruleSchema, type Rule } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { rulesCollection } from '../../utils/db'

const createRuleSchema = ruleSchema.omit({ id: true })

export default defineEventHandler(async (event): Promise<Rule> => {
  requireSession(event)

  const parsed = createRuleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check the rule details and try again.'
    })
  }

  const _id = new ObjectId()
  const rules = await rulesCollection()
  await rules.insertOne({ _id, ...parsed.data })

  return ruleSchema.parse({ id: _id.toHexString(), ...parsed.data })
})
