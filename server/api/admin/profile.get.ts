import type { AdminProfile } from '#shared/types/admin'
import { requireAdmin } from '../../utils/auth'
import { usersCollection } from '../../utils/db'

/**
 * The signed-in admin's own account, for /admin/settings. Looked up by the
 * username on the session rather than an id, because an admin who has only
 * ever used the ADMIN_USERNAME/ADMIN_PASSWORD env fallback (see
 * server/api/auth/login.post.ts) has no `_id` at all yet — `persisted: false`
 * tells the page to say so, rather than showing an empty email as if it were
 * really blank on a saved account.
 */
export default defineEventHandler(async (event): Promise<AdminProfile> => {
  const session = requireAdmin(event)

  const users = await usersCollection()
  const account = await users.findOne({ username: session.username.toLowerCase(), role: 'admin' })

  return {
    username: account?.username ?? session.username.toLowerCase(),
    email: account?.email ?? '',
    displayName: account?.displayName ?? session.displayName,
    persisted: Boolean(account)
  }
})
