import type { AdminUserCounts, AdminUserSummary } from '#shared/types/admin'
import { requireAdmin } from '../../utils/auth'
import { usersCollection } from '../../utils/db'

/**
 * Every business-owner account, newest first, for the admin dashboard. Admin
 * accounts are left out — there is nothing for another admin to approve or
 * deactivate about them here.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const users = await usersCollection()
  const accounts = await users
    .find({ role: 'business_owner' })
    .sort({ createdAt: -1 })
    .toArray()

  const items: AdminUserSummary[] = accounts.map(account => ({
    id: account._id.toHexString(),
    username: account.username,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    status: account.status,
    businessSize: account.businessSize,
    phone: account.phone,
    location: account.location,
    estimatedCustomersPerMonth: account.estimatedCustomersPerMonth,
    createdAt: account.createdAt
  }))

  const counts: AdminUserCounts = { pending: 0, approved: 0, deactivated: 0, rejected: 0 }
  for (const item of items) counts[item.status]++

  return { items, counts }
})
