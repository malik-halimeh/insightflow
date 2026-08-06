import { createHash } from 'node:crypto'
import { resetPasswordSchema } from '#shared/schemas'
import { usersCollection } from '../../utils/db'
import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const parsed = resetPasswordSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check your details and try again.'
    })
  }

  const { token, password } = parsed.data
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const users = await usersCollection()
  const account = await users.findOne({ passwordResetTokenHash: tokenHash })

  const expired = !account?.passwordResetExpiresAt
    || new Date(account.passwordResetExpiresAt).getTime() < Date.now()

  if (!account || expired) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This reset link is invalid or has expired. Please request a new one.'
    })
  }

  const passwordHash = await hashPassword(password)

  await users.updateOne(
    { _id: account._id },
    {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '', passwordResetRequestedAt: '' }
    }
  )

  return { message: 'Your password has been changed. You can now sign in.' }
})
