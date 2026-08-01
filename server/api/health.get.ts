import { getMongoClient } from '../utils/db'

/**
 * Unauthenticated on purpose: the host polls this to decide whether the instance is
 * alive, and it has no session. It reports only whether the database answered, never
 * why it did not — a driver error message can contain the connection string.
 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const config = useRuntimeConfig(event)

  let database: 'up' | 'down' = 'down'

  try {
    const client = await getMongoClient()
    // Ping rather than getDb(), so a health check never triggers index creation.
    await client.db(config.mongodbDb || undefined).command({ ping: 1 })
    database = 'up'
  } catch {
    database = 'down'
  }

  const healthy = database === 'up'

  // A non-200 is what makes the host treat the instance as unhealthy.
  if (!healthy) setResponseStatus(event, 503)

  return {
    status: healthy ? ('ok' as const) : ('degraded' as const),
    database,
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt
  }
})
