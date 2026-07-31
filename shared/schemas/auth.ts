import { z } from 'zod'

/**
 * Name of the session cookie. Lives here because both the server (which sets it)
 * and the route middleware (which reads it) need to agree on it, and neither may
 * import from the other's folder.
 */
export const SESSION_COOKIE = 'insightflow_session'

export const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username.'),
  password: z.string().min(1, 'Please enter your password.')
})

export type LoginInput = z.infer<typeof loginSchema>
