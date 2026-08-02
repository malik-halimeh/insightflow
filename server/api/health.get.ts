// Owner: M1
// GET /api/health
// Simple, dependency-free status check — mainly "are we actually talking to
// MongoDB right now". Useful for local debugging, uptime checks, and for
// front-end code that wants to show a connection banner without piggybacking
// on a data-fetching route.

import { pingDatabase } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const mongo = await pingDatabase()
  return {
    ok: mongo.connected,
    mongo,
    timestamp: new Date().toISOString(),
  }
})
