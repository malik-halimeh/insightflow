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
 *
 * This also keeps the two workspaces apart. `/admin/**` is its own portal: a
 * business owner who lands there is sent back to their dashboard, and an admin
 * who opens `/dashboard`, `/datasets` or `/recommendations` is sent to `/admin`
 * instead of a workspace that holds no data for them. Neither redirect is the
 * actual protection. `requireAdmin` on the server is, and this only decides which
 * page someone sees.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // The login page can never be gated, whatever a page happens to declare.
  // Without this, a redirect to /login would re-enter this middleware and loop.
  if (to.path === '/login') return

  const session = await useRequestFetch()('/api/auth/session').catch(() => null)

  if (!session?.authenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  const isAdminRoute = to.path.startsWith('/admin')

  if (isAdminRoute && session.role !== 'admin') {
    return navigateTo('/dashboard')
  }

  if (!isAdminRoute && session.role === 'admin') {
    return navigateTo('/admin')
  }
})
