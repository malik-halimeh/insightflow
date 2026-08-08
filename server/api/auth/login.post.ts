import { createHash } from 'node:crypto'
import { SESSION_COOKIE, loginSchema, type UserRole } from '#shared/schemas'
import { SESSION_TTL_SECONDS, createSessionToken, credentialsMatch } from '../../utils/session'
import { verifyPassword } from '../../utils/password'
import { usersCollection } from '../../utils/db'

// One message for every credential failure. Saying which half was wrong would let
// someone confirm a valid username by trying it against a wrong password.
const GENERIC_FAILURE = 'That username/email and password did not match. Please try again.'

const STATUS_MESSAGE: Record<'pending' | 'deactivated' | 'rejected', string> = {
  pending: 'Your account is still waiting for an admin to approve it. Please check back soon.',
  deactivated: 'This account has been deactivated. Please contact an administrator.',
  rejected: 'This account was not approved. Please contact an administrator.'
}

// Where to send someone after sign-in, decided entirely by the role on the
// matched account — never by anything the client sent.
const REDIRECT_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  business_owner: '/dashboard'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Sign in is not configured on this server.'
    })
  }

  const parsed = loginSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? GENERIC_FAILURE
    })
  }

  const identifier = parsed.data.identifier.trim().toLowerCase()
  const { password } = parsed.data

  let userId: string | null = null
  let username: string | null = null
  let displayName: string | null = null
  let role: UserRole | null = null

  // Registered accounts first: a username or an email, checked against the hash
  // stored in Mongo. Whatever role is on the matched row is the role used from
  // here on — the client never gets a say in it.
  const users = await usersCollection()
  const account = await users.findOne({ $or: [{ username: identifier }, { email: identifier }] })

  if (account && await verifyPassword(password, account.passwordHash)) {
    // The account exists and the password is right, so from here on a failure can
    // be specific — it can no longer help a stranger guess a valid login.
    if (account.role === 'business_owner' && account.status !== 'approved') {
      throw createError({ statusCode: 403, statusMessage: STATUS_MESSAGE[account.status] })
    }

    userId = account._id.toHexString()
    username = account.username
    displayName = account.displayName
    role = account.role
  } else if (!account && config.authUsername && config.authPassword) {
    // Falls back to the single owner account from the environment, for a machine
    // that has not been seeded yet. Only reached when no account matched at all,
    // so it can never override a real one. This fallback is always a business owner.
    const matches = credentialsMatch(
      { username: identifier, password },
      { username: config.authUsername.toLowerCase(), password: config.authPassword }
    )
    if (matches) {
      /*
        The bootstrap account has no row in `users`, so it has no `_id` to scope
        its work by. It gets one derived from its own username instead: stable
        across restarts, so the data sets it creates are still its own after a
        redeploy, and distinct from every real account's id because no ObjectId is
        ever generated this way.

        Deriving rather than inventing matters. A fixed literal would be shared by
        every machine using the fallback, and a random one would orphan the
        previous session's data on every restart.
      */
      userId = createHash('sha256').update(`bootstrap:${config.authUsername.toLowerCase()}`).digest('hex').slice(0, 24)
      username = config.authUsername
      displayName = config.authUsername
      role = 'business_owner'
    }
  }

  if (!userId || !username || !displayName || !role) {
    throw createError({ statusCode: 401, statusMessage: GENERIC_FAILURE })
  }

  setCookie(
    event,
    SESSION_COOKIE,
    createSessionToken(userId, username, displayName, role, config.sessionSecret),
    {
      httpOnly: true,
      sameSite: 'lax',
      // Off in dev so the cookie survives plain http on localhost.
      secure: !import.meta.dev,
      path: '/',
      maxAge: SESSION_TTL_SECONDS
    }
  )

  return { username, displayName, role, redirect: REDIRECT_BY_ROLE[role] }
})
