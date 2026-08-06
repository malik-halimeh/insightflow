import { ruleSchema, type Rule } from '#shared/schemas'
import { requireSession } from '../../utils/auth'
import { rulesCollection } from '../../utils/db'

export default defineEventHandler(async (event): Promise<Rule[]> => {
  requireSession(event)

  const rules = await rulesCollection()
  const documents = await rules.find({}).sort({ _id: 1 }).toArray()

  return documents.map(({ _id, ...rest }) =>
    ruleSchema.parse({ id: _id.toHexString(), ...rest })
  )
})
