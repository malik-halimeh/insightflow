import { SESSION_COOKIE } from '#shared/schemas'

/**
 * Decodes the expiry without checking the signature. The signature cannot be checked
 * here because that needs the secret, which must never reach the browser. This is a
 * navigation gate only: every server route verifies the signature itself before
 * returning data, so a forged cookie gets an empty page and nothing else.
 */
function hasUnexpiredSession(token: string | null | undefined): boolean {
  if (!token) return false

  const [body] = token.split('.')
  if (!body) return false

  try {
    const padded = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')))

    if (typeof payload !== 'object' || payload === null) return false
    const { exp } = payload as { exp?: unknown }

    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export default defineNuxtRouteMiddleware((to) => {
  // The login page can never be gated, whatever a page happens to declare.
  // Without this, a redirect to /login would re-enter this middleware and loop.
  if (to.path === '/login') return

  const token = useCookie<string | null>(SESSION_COOKIE)
  if (hasUnexpiredSession(token.value)) return

  return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
