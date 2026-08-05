import { MongoServerError, ObjectId } from 'mongodb'
import { registerSchema, userSchema } from '#shared/schemas'
import { hashPassword } from '../../utils/password'
import { usersCollection } from '../../utils/db'

const DUPLICATE_KEY = 11000

/**
 * Creates a business-owner account in `users`, always with `status: 'pending'`.
 * No session cookie is set here and the account cannot sign in yet — an admin
 * has to approve it first from /admin. This is the only way a business-owner
 * account gets created; there is no equivalent public endpoint for `admin`
 * accounts, so nobody can grant themselves administrative access this way.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Sign up is not configured on this server.'
    })
  }

  const parsed = registerSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Please check your details and try again.'
    })
  }

  const username = parsed.data.username.toLowerCase()
  const email = parsed.data.email.toLowerCase()
  const { displayName, password, businessSize, phone, location, estimatedCustomersPerMonth } = parsed.data

  const users = await usersCollection()

  const existing = await users.findOne({ $or: [{ username }, { email }] })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: existing.username === username
        ? 'That username is already taken. Please choose another.'
        : 'An account with that email already exists. Please sign in instead.'
    })
  }

  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()
  const _id = new ObjectId()

  const record = userSchema.parse({
    id: _id.toHexString(),
    username,
    email,
    displayName,
    role: 'business_owner',
    status: 'pending',
    businessSize,
    phone,
    location,
    estimatedCustomersPerMonth,
    createdAt: now
  })

  const { id, ...rest } = record

  try {
    await users.insertOne({ _id, ...rest, passwordHash })
  } catch (error) {
    // A race between the check above and this insert is rare but possible with two
    // concurrent sign-ups for the same username or email.
    if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
      throw createError({
        statusCode: 409,
        statusMessage: 'That username or email is already registered. Please sign in instead.'
      })
    }
    throw error
  }

  return {
    username: record.username,
    displayName: record.displayName,
    status: record.status
  }
})
