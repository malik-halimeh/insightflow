import type { BusinessSize, UserRole, UserStatus } from '../schemas'

/**
 * The shape of one row on the admin dashboard's user table. Derived from
 * `UserDocument`, with `_id` rendered as the hex-string `id` and the password
 * hash left out entirely — this is a read model for the admin UI, not a stored
 * record, so it has no Zod schema of its own.
 */
export interface AdminUserSummary {
  id: string
  username: string
  email: string
  displayName: string
  role: UserRole
  status: UserStatus
  businessSize?: BusinessSize
  phone?: string
  location?: string
  estimatedCustomersPerMonth?: number
  createdAt: string
}

export interface AdminUserCounts {
  pending: number
  approved: number
  deactivated: number
  rejected: number
}

/**
 * The signed-in admin's own account, as shown on /admin/settings.
 * `persisted` is false when the session's username has no row in `users` — the
 * page says so rather than showing an empty email as if it were genuinely blank.
 */
export interface AdminProfile {
  username: string
  email: string
  displayName: string
  persisted: boolean
}
