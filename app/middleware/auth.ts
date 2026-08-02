/**
 * Asks the server whether the session is valid, rather than reading the cookie here.
 *
 * The cookie is httpOnly, so `document.cookie` cannot see it, and the private pages
 * are `ssr: false`, so there is no server render to read the request headers during.
 * Reading the cookie in the browser therefore always finds nothing and sends a
 * signed-in owner back to the login page.
 *
 * Asking the server also means the signature is actually checked. A forged cookie
 * now fails here, instead of rendering an empty page shell.
 *
 * `useRequestFetch` forwards the incoming cookies during server rendering, so the
 * same call works on both sides.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // The login page can never be gated, whatever a page happens to declare.
  // Without this, a redirect to /login would re-enter this middleware and loop.
  if (to.path === '/login') return

  const session = await useRequestFetch()('/api/auth/session').catch(() => null)

  if (session?.authenticated) return

  return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
