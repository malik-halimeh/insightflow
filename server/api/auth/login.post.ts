import { SESSION_COOKIE, loginSchema } from '#shared/schemas'
import { SESSION_TTL_SECONDS, createSessionToken, credentialsMatch } from '../../utils/session'

// One message for every failure. Saying which half was wrong would let someone
// confirm a valid username by trying it against a wrong password.
const GENERIC_FAILURE = 'That username and password did not match. Please try again.'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.authUsername || !config.authPassword || !config.sessionSecret) {
    // Without this, an unset AUTH_PASSWORD would make an empty password valid.
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

  const matches = credentialsMatch(parsed.data, {
    username: config.authUsername,
    password: config.authPassword
  })

  if (!matches) {
    throw createError({ statusCode: 401, statusMessage: GENERIC_FAILURE })
  }

  setCookie(event, SESSION_COOKIE, createSessionToken(parsed.data.username, config.sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    // Off in dev so the cookie survives plain http on localhost.
    secure: !import.meta.dev,
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  })

  return { username: parsed.data.username }
})
