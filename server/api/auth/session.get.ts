import { SESSION_COOKIE } from '#shared/schemas'
import { verifySessionToken } from '../../utils/session'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, SESSION_COOKIE)

  const payload = token && config.sessionSecret
    ? verifySessionToken(token, config.sessionSecret)
    : null

  if (!payload) return { authenticated: false as const }

  return {
    authenticated: true as const,
    username: payload.username,
    displayName: payload.displayName,
    role: payload.role,
    expiresAt: payload.exp
  }
})
