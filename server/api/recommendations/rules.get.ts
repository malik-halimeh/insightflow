import type { Rule } from '#shared/schemas'

export default defineEventHandler(async (event): Promise<Rule[]> => {
  // A rule is the one owned record that hangs off an account rather than a data
  // set, so it carries `ownerId` itself and this filters on it directly. Without
  // it every owner shared one list and could edit rules another owner wrote.
  const ownerId = requireOwnerId(event)

  const collection = await rulesCollection()
  const documents = await collection
    .find({ ownerId })
    .sort({ name: 1 })
    .toArray()

  return documents.map(({ _id, ...rule }) => ({
    id: _id.toHexString(),
    ...rule
  }))
})