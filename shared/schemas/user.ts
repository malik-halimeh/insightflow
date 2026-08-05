import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'

// Shared across userSchema and registerSchema, so a rule is written once and an
// owner sees the same message whether they are updating a profile or signing up.
export const usernameSchema = z
  .string()
  .min(3, 'Please choose a username of at least 3 characters.')
  .max(24, 'Please keep your username to 24 characters or fewer.')
  .regex(
    /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i,
    'Usernames can only contain letters, numbers, hyphens and underscores.'
  )

export const emailSchema = z.email('Please enter a valid email address.')

export const displayNameSchema = z
  .string()
  .min(1, 'Please enter the name you would like shown.')
  .max(60, 'Please keep your name to 60 characters or fewer.')

/**
 * Who the account belongs to. `business_owner` is the only role anyone can sign
 * up for from `/login` — an `admin` account is provisioned directly in the
 * database (see `npm run seed` and `docs/HANDOFF.md`), never through the public
 * register endpoint, so nobody can grant themselves administrative access.
 */
export const userRoleSchema = z.enum(['business_owner', 'admin'])
export type UserRole = z.infer<typeof userRoleSchema>

/**
 * A business owner's standing in the workspace.
 * - `pending`     just registered, waiting for an admin to review the account.
 * - `approved`    can sign in and use the workspace normally.
 * - `deactivated` was approved, then switched off by an admin. Can no longer sign in.
 * - `rejected`    an admin decided the account should not be approved.
 *
 * Admin accounts are always `approved` — the status only governs whether a
 * business owner may sign in, so the concept does not apply to admins.
 */
export const userStatusSchema = z.enum(['pending', 'approved', 'deactivated', 'rejected'])
export type UserStatus = z.infer<typeof userStatusSchema>

export const businessSizeSchema = z.enum(['small', 'medium', 'large'])
export type BusinessSize = z.infer<typeof businessSizeSchema>

export const BUSINESS_SIZE_OPTIONS: { value: BusinessSize, label: string, hint: string }[] = [
  { value: 'small', label: 'Small', hint: 'Fewer than 10 people' },
  { value: 'medium', label: 'Medium', hint: '10–50 people' },
  { value: 'large', label: 'Large', hint: 'More than 50 people' }
]

export const phoneSchema = z
  .string()
  .min(7, 'Please enter a valid phone number.')
  .max(20, 'Please keep your phone number to 20 characters or fewer.')
  .regex(/^[0-9+()\-.\s]+$/, 'Please use only numbers and phone punctuation, e.g. +1 555 123 4567.')

export const locationSchema = z
  .string()
  .min(2, 'Please enter where your business is located.')
  .max(120, 'Please keep your location to 120 characters or fewer.')

export const estimatedCustomersPerMonthSchema = z
  .number('Please enter how many customers you serve in an average month.')
  .int('Please enter a whole number.')
  .min(1, 'Please enter at least 1.')
  .max(1_000_000, 'Please enter a number under 1,000,000.')

// Fields that only exist on a business-owner account. Optional at this level
// because an admin document carries none of them — registerSchema below is
// what makes them required at sign-up.
export const businessProfileSchema = z.object({
  businessSize: businessSizeSchema,
  phone: phoneSchema,
  location: locationSchema,
  estimatedCustomersPerMonth: estimatedCustomersPerMonthSchema
})

export const userSchema = z.object({
  id: idSchema,
  username: usernameSchema,
  email: emailSchema,
  displayName: displayNameSchema,
  role: userRoleSchema,
  status: userStatusSchema,
  businessSize: businessSizeSchema.optional(),
  phone: phoneSchema.optional(),
  location: locationSchema.optional(),
  estimatedCustomersPerMonth: estimatedCustomersPerMonthSchema.optional(),
  createdAt: isoDateTimeSchema
})

export type User = z.infer<typeof userSchema>
