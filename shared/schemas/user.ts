import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'

export const userSchema = z.object({
  id: idSchema,
  username: z.string().min(1, 'Please enter your username.'),
  displayName: z.string().min(1, 'Please enter the name you would like shown.'),
  createdAt: isoDateTimeSchema
})

export type User = z.infer<typeof userSchema>
