import { z } from 'zod'

/**
 * The actions an admin can take on a business-owner account from the admin
 * dashboard. Kept as an action rather than a raw status: it reads at the call
 * site (`{ action: 'approve' }`), and it lets the server refuse actions that
 * make no sense for the account's current status (see server/api/admin/users).
 */
export const adminUserActionSchema = z.enum(['approve', 'reject', 'deactivate', 'reactivate'])
export type AdminUserAction = z.infer<typeof adminUserActionSchema>

export const adminUserActionInputSchema = z.object({
  action: adminUserActionSchema
})

export type AdminUserActionInput = z.infer<typeof adminUserActionInputSchema>
