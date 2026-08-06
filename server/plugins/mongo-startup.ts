// Owner: M1
// Logs whether this process reached MongoDB, once, right after the server
// starts listening. Purely informational — /api/health stays the source of
// truth a host or uptime monitor should poll. This only saves reaching for
// curl during local dev to answer "did my .env actually work?".
import { pingDatabase } from '../utils/db'

export default defineNitroPlugin(async () => {
  const result = await pingDatabase()

  if (result.connected) {
    console.log(`[mongo] connected to "${result.dbName}" (${result.tookMs}ms)`)
  } else if (result.status === 'unconfigured') {
    console.warn('[mongo] MONGODB_URI is not set — copy .env.example to .env and fill it in.')
  } else {
    console.error(`[mongo] could not reach "${result.dbName}": ${result.error}`)
  }
})
