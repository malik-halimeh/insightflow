import { adminProfileUpdateSchema, SESSION_COOKIE } from '#shared/schemas'
import type { AdminProfile } from '#shared/types/admin'
import { requireAdmin } from '../../utils/auth'
import { usersCollection } from '../../utils/db'
import { hashPassword, verifyPassword } from '../../utils/password'
import { createSessionToken, SESSION_TTL_SECONDS } from '../../utils/session'

/**
 * Lets the signed-in admin change their own display name, username, email and
 * password.
 *
 * The account must already exist in `users`. An earlier version of this route
 * also accepted an ADMIN_USERNAME/ADMIN_PASSWORD pair from the environment and
 * created the row on first save. That path is deliberately gone: it made an
 * environment variable a second, database-free way to hold administrative
 * access, and the matching values were published in .env.example on a public
 * repository. Admin accounts come from `npm run seed` and nowhere else.
 */
export default defineEventHandler(async (event): Promise<AdminProfile> => {
  const session = requireAdmin(event)
  const config = useRuntimeConfig(event)

  const parsed = adminProfileUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check your details and try again.'
    })
  }

  const { displayName, currentPassword, newPassword } = parsed.data
  const username = parsed.data.username.toLowerCase()
  const email = parsed.data.email.toLowerCase()

  const users = await usersCollection()
  const account = await users.findOne({ username: session.username.toLowerCase(), role: 'admin' })

  if (!account) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This admin account does not exist in the database, so there is nothing to update.'
    })
  }

  // Confirm the request really came from this admin before changing anything.
  // A valid session is not enough on its own: a hijacked one could otherwise
  // change the email and password quietly and lock the real admin out.
  const currentPasswordOk = await verifyPassword(currentPassword, account.passwordHash)

  if (!currentPasswordOk) {
    throw createError({ statusCode: 401, statusMessage: 'Your current password is incorrect.' })
  }

  if (username !== account?.username || email !== account?.email) {
    const clash = await users.findOne({ $or: [{ username }, { email }] })
    const isSelf = Boolean(clash && clash._id.equals(account._id))
    if (clash && !isSelf) {
      throw createError({
        statusCode: 409,
        statusMessage: clash.username === username
          ? 'That username is already taken. Please choose another.'
          : 'An account with that email already exists.'
      })
    }
  }

  // An empty newPassword means "leave the password alone", so the existing hash
  // is reused rather than rehashed — rehashing would change the stored value
  // for a request that never asked to change the password.
  const passwordHash = newPassword
    ? await hashPassword(newPassword)
    : account.passwordHash

  await users.updateOne(
    { _id: account._id },
    { $set: { username, email, displayName, passwordHash } }
  )

  // The session cookie carries username/displayName directly, so it has to be
  // reissued whenever either changes — otherwise the sidebar and every later
  // requireAdmin() call keep referring to the old identity for the rest of
  // this session even though the database has already moved on.
  //
  // The userId is the one thing that does not change here. It is the account's
  // `_id`, which is exactly why owned records are keyed on it rather than on a
  // username: renaming an account leaves everything it owns still attached.
  setCookie(
    event,
    SESSION_COOKIE,
    createSessionToken(account._id.toHexString(), username, displayName, 'admin', config.sessionSecret),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.dev,
      path: '/',
      maxAge: SESSION_TTL_SECONDS
    }
  )

  return { username, email, displayName, persisted: true }
})
