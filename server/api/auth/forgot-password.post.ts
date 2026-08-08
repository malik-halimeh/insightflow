import { createHash, randomBytes } from 'node:crypto'
import { forgotPasswordSchema } from '#shared/schemas'
import { usersCollection } from '../../utils/db'
import { sendEmail } from '../../utils/email'

// Always the same response, whether or not the email is registered — the
// difference would let this form be used to confirm a valid account exists.
const GENERIC_MESSAGE = 'If an account exists for that email, we have sent a link to reset the password.'

const TOKEN_TTL_MINUTES = 30
const REQUEST_COOLDOWN_SECONDS = 60

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const parsed = forgotPasswordSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please enter a valid email address.'
    })
  }

  const email = parsed.data.email.toLowerCase()
  const users = await usersCollection()
  const account = await users.findOne({ email })

  if (!account) {
    return { message: GENERIC_MESSAGE }
  }

  // A repeat click within the cooldown window is treated as a success without
  // sending a second email — this is what keeps the form from being used to
  // spam someone's inbox or burn through the Elastic Email quota.
  if (account.passwordResetRequestedAt) {
    const elapsedSeconds = (Date.now() - new Date(account.passwordResetRequestedAt).getTime()) / 1000
    if (elapsedSeconds < REQUEST_COOLDOWN_SECONDS) {
      return { message: GENERIC_MESSAGE }
    }
  }

  // The raw token goes in the email link and is never stored — only its hash
  // is, so a database read alone can never produce a working reset link.
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60_000).toISOString()

  await users.updateOne(
    { _id: account._id },
    {
      $set: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: now.toISOString()
      }
    }
  )

  const resetUrl = `${config.public.siteUrl}/reset-password?token=${rawToken}`

  await sendEmail(event, {
    to: account.email,
    subject: 'Reset your InsightFlow password',
    html: `
      <p>Hi ${account.displayName},</p>
      <p>Someone asked to reset the password on your InsightFlow account. If this was you, use the link below — it expires in ${TOKEN_TTL_MINUTES} minutes.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email. Your password will not change.</p>
    `
  })

  return { message: GENERIC_MESSAGE }
})
