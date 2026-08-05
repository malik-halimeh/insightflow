import { ObjectId } from 'mongodb'
import { adminUserActionInputSchema, idSchema, type UserStatus } from '#shared/schemas'
import { requireAdmin } from '../../../../utils/auth'
import { usersCollection } from '../../../../utils/db'

/**
 * Which statuses an action is allowed to start from, and what it moves the
 * account to. Kept as one table so the allowed transitions are visible in one
 * place rather than scattered across if-statements.
 */
const TRANSITIONS: Record<string, { from: UserStatus[], to: UserStatus }> = {
  approve: { from: ['pending', 'rejected'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  deactivate: { from: ['approved'], to: 'deactivated' },
  reactivate: { from: ['deactivated'], to: 'approved' }
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id || !idSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'We could not identify this account.' })
  }

  const body = adminUserActionInputSchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message ?? 'Please choose a valid action.'
    })
  }

  const users = await usersCollection()
  const account = await users.findOne({ _id: new ObjectId(id) })

  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'That account no longer exists.' })
  }

  if (account.role !== 'business_owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Administrator accounts cannot be approved, rejected or deactivated here.'
    })
  }

  const transition = TRANSITIONS[body.data.action]!
  if (!transition.from.includes(account.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: `This account is currently "${account.status}", so that action no longer applies. Refresh the page and try again.`
    })
  }

  await users.updateOne({ _id: account._id }, { $set: { status: transition.to } })

  return { id, status: transition.to }
})
