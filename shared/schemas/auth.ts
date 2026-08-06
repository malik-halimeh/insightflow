import { z } from 'zod'
import {
  businessSizeSchema,
  displayNameSchema,
  emailSchema,
  estimatedCustomersPerMonthSchema,
  locationSchema,
  phoneSchema,
  usernameSchema
} from './user'

/**
 * Name of the session cookie. Lives here because both the server (which sets it)
 * and the route middleware (which reads it) need to agree on it, and neither may
 * import from the other's folder.
 */
export const SESSION_COOKIE = 'insightflow_session'

export const passwordSchema = z
  .string()
  .min(8, 'Please use a password of at least 8 characters.')
  .max(72, 'Please keep your password to 72 characters or fewer.')
  .regex(/[a-zA-Z]/, 'Please include at least one letter in your password.')
  .regex(/[0-9]/, 'Please include at least one number in your password.')

// "identifier" rather than "username" because sign in accepts either the
// username or the email an owner registered with. There is no account-type
// field: one sign-in form serves every role, and the server looks up the
// matched account and returns its real role — the role is never taken from
// client input, so it can't be used to elevate access.
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your username or email.'),
  password: z.string().min(1, 'Please enter your password.')
})

export type LoginInput = z.infer<typeof loginSchema>

// Sign-up always creates a business_owner account — an admin account can only
// be created directly in the database, never through this public endpoint.
export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    displayName: displayNameSchema,
    businessSize: businessSizeSchema,
    phone: phoneSchema,
    location: locationSchema,
    estimatedCustomersPerMonth: estimatedCustomersPerMonthSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.')
  })
  .refine(value => value.password === value.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword']
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// token is opaque to the client — it only ever round-trips the value from the
// query string of the emailed link, so it gets no format rule of its own here.
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'This reset link is missing its token.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.')
  })
  .refine(value => value.password === value.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword']
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
