export default defineNuxtRouteMiddleware(async () => {
  const session = await useRequestFetch()('/api/auth/session').catch(() => null)

  if (!session?.authenticated) return

  return navigateTo(session.role === 'admin' ? '/admin' : '/dashboard')
})
