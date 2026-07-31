import { SESSION_COOKIE } from '#shared/schemas'

export default defineEventHandler((event) => {
  // Path must match the one the cookie was set with, or the browser keeps it.
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
