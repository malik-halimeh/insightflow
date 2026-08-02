// Owner: M1
// Seeds one sample dataset + ~90 days of realistic sales rows into MongoDB
// so /dashboard has real data to render (charts, KPIs, top sellers, etc.)
// instead of the "No datasets yet" empty state.
//
// Run with: npx tsx scripts/seed.ts
//
// Reads MONGODB_URI / MONGODB_DB straight from .env (same vars the app
// uses) — no extra dependency needed for that. Safe to re-run: each run
// inserts a new dataset rather than overwriting, so if you want a clean
// slate, drop the `datasets` and `salesRows` collections first.

import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import { MongoClient, ObjectId } from 'mongodb'

// Same SRV DNS fix as server/utils/db.ts — some networks don't forward
// SRV/TXT lookups, which breaks mongodb+srv:// URIs.
dns.setServers(['8.8.8.8', '1.1.1.1'])
dns.setDefaultResultOrder('ipv4first')

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnv()

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'insightflow'

if (!uri) {
  console.error('MONGODB_URI is missing — copy .env.example to .env and fill it in first.')
  process.exit(1)
}

interface MenuItem {
  itemName: string
  category: string
  unitPrice: number
  /** relative popularity, used to weight random daily quantity */
  weight: number
}

const MENU: MenuItem[] = [
  { itemName: 'Espresso', category: 'Coffee', unitPrice: 3.5, weight: 1.0 },
  { itemName: 'Cappuccino', category: 'Coffee', unitPrice: 4.75, weight: 1.3 },
  { itemName: 'Latte', category: 'Coffee', unitPrice: 5.0, weight: 1.5 },
  { itemName: 'Cold Brew', category: 'Coffee', unitPrice: 5.25, weight: 1.1 },
  { itemName: 'Croissant', category: 'Pastry', unitPrice: 4.0, weight: 0.9 },
  { itemName: 'Blueberry Muffin', category: 'Pastry', unitPrice: 3.75, weight: 0.7 },
  { itemName: 'Avocado Toast', category: 'Food', unitPrice: 8.5, weight: 0.5 },
  { itemName: 'Turkey Sandwich', category: 'Food', unitPrice: 9.25, weight: 0.4 },
  { itemName: 'Iced Tea', category: 'Beverage', unitPrice: 3.25, weight: 0.6 },
  { itemName: 'Orange Juice', category: 'Beverage', unitPrice: 4.0, weight: 0.5 },
]

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

async function main() {
  const client = new MongoClient(uri!, { serverSelectionTimeoutMS: 8000 })
  console.log('Connecting to MongoDB…')
  await client.connect()
  console.log('Connected. Seeding sample data…')
  const db = client.db(dbName)

  const datasetsCol = db.collection('datasets')
  const rowsCol = db.collection('salesRows')

  const DAYS = 90
  const today = new Date()
  const periodEnd = new Date(today)
  const periodStart = new Date(today)
  periodStart.setDate(periodStart.getDate() - (DAYS - 1))

  const datasetId = new ObjectId()
  const rows: Array<{
    datasetId: string
    date: string
    itemName: string
    category: string
    quantity: number
    unitPrice: number
    revenue: number
  }> = []

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(periodStart)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)
    const weekday = date.getUTCDay() // 0=Sun..6=Sat

    // Weekend + Friday boost, midweek dip, so the day-of-week chart has a
    // real pattern instead of flat noise.
    const weekdayMultiplier =
      weekday === 0 || weekday === 6 ? 1.35 : weekday === 5 ? 1.15 : weekday === 2 ? 0.85 : 1.0

    // Gentle upward trend across the period so the revenue trend chart and
    // the hero "second half vs first half" delta aren't flat either.
    const trendMultiplier = 0.85 + (i / DAYS) * 0.4

    for (const item of MENU) {
      const baseQty = randInt(4, 14) * item.weight
      const quantity = Math.max(0, Math.round(baseQty * weekdayMultiplier * trendMultiplier))
      if (quantity === 0) continue
      const revenue = Math.round(quantity * item.unitPrice * 100) / 100
      rows.push({
        datasetId: datasetId.toString(),
        date: dateStr,
        itemName: item.itemName,
        category: item.category,
        quantity,
        unitPrice: item.unitPrice,
        revenue,
      })
    }
  }

  await datasetsCol.insertOne({
    _id: datasetId,
    name: 'Sample Coffee Shop — Last 90 Days',
    businessType: 'Cafe',
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    rowCount: rows.length,
    createdAt: new Date().toISOString(),
  })

  if (rows.length) {
    await rowsCol.insertMany(rows)
  }

  console.log(`✔ Seeded 1 dataset + ${rows.length} sales rows into "${dbName}".`)
  console.log('  Reload /dashboard — "Sample Coffee Shop — Last 90 Days" should now appear in the dataset selector.')

  await client.close()
}

main().catch((err) => {
  console.error('✘ Seed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
