import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * scrypt rather than a bcrypt/argon2 package — the stack list in CLAUDE.md does not
 * include a hashing dependency, and Node's built-in `crypto.scrypt` is a memory-hard
 * KDF that needs nothing added to package.json.
 */

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
const SALT_BYTES = 16

/** Stored as "salt:hash", both hex, so a single string column holds everything. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const derived = await scryptAsync(password, salt, KEY_LENGTH) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

/** Constant-time comparison, so a mismatch cannot be timed to learn how close it was. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const derived = await scryptAsync(password, salt, KEY_LENGTH) as Buffer
  const expected = Buffer.from(hash, 'hex')
  if (derived.length !== expected.length) return false

  return timingSafeEqual(derived, expected)
}
