// Owner: M1 (server bootstrap)
// Prints a clear, unmissable line in the terminal on every `npm run dev` /
// `npm run preview` start telling you whether the app actually reached
// MongoDB — not just whether MONGODB_URI is present. Runs once when the
// Nitro server boots. Never throws: a failed DB connection must never crash
// the server, it should just be reported (the dashboard already degrades
// gracefully to "No datasets yet" when the DB is unreachable).

export default defineNitroPlugin(async () => {
  const { pingDatabase } = await import('../utils/db')
  const result = await pingDatabase()

  const line = '─'.repeat(52)
  // eslint-disable-next-line no-console
  console.log(line)
  if (result.connected) {
    // eslint-disable-next-line no-console
    console.log(`✔ MongoDB: connected  (db: "${result.dbName}", ${result.tookMs}ms)`)
  } else if (result.status === 'unconfigured') {
    // eslint-disable-next-line no-console
    console.log('✘ MongoDB: NOT connected — MONGODB_URI is missing.')
    console.log('  Copy .env.example to .env and fill in your connection string.')
  } else {
    // eslint-disable-next-line no-console
    console.log('✘ MongoDB: NOT connected')
    console.log(`  db: "${result.dbName}"  reason: ${result.error}`)
    console.log('  Check MONGODB_URI, Atlas network access (IP allowlist), and your internet connection.')
    console.log('  The app will still run — pages that need data will show an empty state until this is fixed.')
  }
  console.log(line)
})
