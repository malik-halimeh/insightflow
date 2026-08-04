import type { Rule } from '#shared/schemas'

export default defineEventHandler(async (event): Promise<Rule[]> => {
  requireSession(event)

  const collection = await rulesCollection()
  const documents = await collection
    .find({})
    .sort({ name: 1 })
    .toArray()

  return documents.map(({ _id, ...rule }) => ({
    id: _id.toHexString(),
    ...rule
  }))
})