import { createError, getCookie, type H3Event } from 'h3'
import { SESSION_COOKIE } from '#shared/schemas'
import { verifySessionToken, type SessionPayload } from './session'

/**
 * Every private route calls this first. The route middleware only gates navigation
 * and cannot check the signature, so this is where a forged cookie is actually
 * refused.
 */
export function requireSession(event: H3Event): SessionPayload {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, SESSION_COOKIE)

  const payload = token && config.sessionSecret
    ? verifySessionToken(token, config.sessionSecret)
    : null

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Please sign in to continue.'
    })
  }

  return payload
}
