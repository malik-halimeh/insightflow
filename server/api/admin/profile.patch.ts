import { ObjectId } from 'mongodb'
import { adminProfileUpdateSchema, SESSION_COOKIE } from '#shared/schemas'
import type { AdminProfile } from '#shared/types/admin'
import { requireAdmin } from '../../utils/auth'
import { usersCollection } from '../../utils/db'
import { hashPassword, verifyPassword } from '../../utils/password'
import { createSessionToken, credentialsMatch, SESSION_TTL_SECONDS } from '../../utils/session'

/**
 * Lets the signed-in admin change their own display name, username, email and
 * password. This is the only way to change an admin password without editing
 * ADMIN_PASSWORD in .env and restarting the server.
 *
 * An admin who has only ever signed in through the ADMIN_USERNAME/ADMIN_PASSWORD
 * env fallback has no row in `users` yet — the first successful save here
 * creates one. From then on, sign-in finds that row and checks the database
 * first (see server/api/auth/login.post.ts), same as any other account, and
 * further edits here update that row instead of creating another one.
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

  // Confirm the request really came from this admin before changing anything —
  // checked against wherever their real credential currently lives: the
  // database once a profile has been saved before, otherwise the env fallback.
  const currentPasswordOk = account
    ? await verifyPassword(currentPassword, account.passwordHash)
    : Boolean(
      config.adminUsername
      && config.adminPassword
      && credentialsMatch(
        { username: session.username.toLowerCase(), password: currentPassword },
        { username: config.adminUsername.toLowerCase(), password: config.adminPassword }
      )
    )

  if (!currentPasswordOk) {
    throw createError({ statusCode: 401, statusMessage: 'Your current password is incorrect.' })
  }

  if (username !== account?.username || email !== account?.email) {
    const clash = await users.findOne({ $or: [{ username }, { email }] })
    const isSelf = Boolean(clash && account && clash._id.equals(account._id))
    if (clash && !isSelf) {
      throw createError({
        statusCode: 409,
        statusMessage: clash.username === username
          ? 'That username is already taken. Please choose another.'
          : 'An account with that email already exists.'
      })
    }
  }

  const passwordHash = newPassword
    ? await hashPassword(newPassword)
    : account?.passwordHash ?? await hashPassword(currentPassword)

  if (account) {
    await users.updateOne({ _id: account._id }, { $set: { username, email, displayName, passwordHash } })
  } else {
    await users.insertOne({
      _id: new ObjectId(),
      username,
      email,
      displayName,
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString(),
      passwordHash
    })
  }

  // The session cookie carries username/displayName directly, so it has to be
  // reissued whenever either changes — otherwise the sidebar and every later
  // requireAdmin() call keep referring to the old identity for the rest of
  // this session even though the database has already moved on.
  setCookie(
    event,
    SESSION_COOKIE,
    createSessionToken(username, displayName, 'admin', config.sessionSecret),
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
