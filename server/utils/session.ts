import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionPayload {
  username: string
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
  username: string,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const payload: SessionPayload = {
    username,
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
