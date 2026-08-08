import { createHmac, timingSafeEqual } from 'node:crypto'
import type { UserRole } from '#shared/schemas'

export interface SessionPayload {
  /**
   * The signed-in account's `_id` as a hex string, and the key every owned record
   * is scoped by.
   *
   * The id rather than the username, for the same reason every other foreign key
   * in this project is an id: a username is a label a person may one day change,
   * and data keyed on it would be orphaned the moment they did.
   */
  userId: string
  username: string
  displayName: string
  /**
   * Carried in the signed token so a request never has to read the user record
   * back to find out what the caller may do. The token is HMAC-signed, so this
   * cannot be edited in the browser — but it is a snapshot: an account whose
   * role or status changes keeps the old session until it expires.
   */
  role: UserRole
  /** Unix seconds. */
  exp: number
}

export const SESSION_TTL_SECONDS = 60 * 60 * 8

/**
 * The cookie is httpOnly, so `document.cookie` cannot see it from the browser at all,
 * and during server rendering there is no `document` to read in the first place.
 * `useCookie` covers both: on the server it reads the incoming request headers, and
 * on the client it reads the value Nuxt carried over from that same render. One call
 * therefore behaves identically in both places, which is what route middleware needs.
 */
function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

/** Constant-time comparison that does not leak length through an early return. */
function safeEqual(a: string, b: string): boolean {
  const bufA = createHmac('sha256', 'compare').update(a).digest()
  const bufB = createHmac('sha256', 'compare').update(b).digest()
  return timingSafeEqual(bufA, bufB)
}

export function createSessionToken(
  userId: string,
  username: string,
  displayName: string,
  role: UserRole,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const payload: SessionPayload = {
    userId,
    username,
    displayName,
    role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  }

  const body = base64UrlEncode(JSON.stringify(payload))
  return `${body}.${sign(body, secret)}`
}

/** Returns the payload only if the signature matches and the token has not expired. */
export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  if (!safeEqual(signature, sign(body, secret))) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(base64UrlDecode(body)) as SessionPayload
  } catch {
    return null
  }

  if (typeof payload.username !== 'string' || typeof payload.exp !== 'number') return null
  // A token issued before roles existed carries neither field, so it is refused
  // and the owner signs in again. Defaulting it to a role instead would be
  // guessing at someone's access level from a token that never stated one.
  if (typeof payload.displayName !== 'string') return null
  // Same reasoning, and it matters more here. A token issued before per-owner
  // scoping carries no userId, and the only alternatives to refusing it are to
  // guess whose data it may read or to let it read everyone's. Refusing costs one
  // sign-in; the sessions in question expire within eight hours anyway.
  if (typeof payload.userId !== 'string' || payload.userId === '') return null
  if (payload.role !== 'business_owner' && payload.role !== 'admin') return null
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null

  return payload
}

/** Compares a supplied credential against the configured one in constant time. */
export function credentialsMatch(
  supplied: { username: string, password: string },
  expected: { username: string, password: string }
): boolean {
  // Both comparisons always run: short-circuiting on the username would let an
  // attacker learn which half was wrong from the response time.
  const usernameOk = safeEqual(supplied.username, expected.username)
  const passwordOk = safeEqual(supplied.password, expected.password)
  return usernameOk && passwordOk
}
