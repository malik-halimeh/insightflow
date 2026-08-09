import { createHash } from 'node:crypto'
import { salesRowSchema, type SalesRow } from '../shared/schemas'

export const PRESENTATION_SEED_ID = 'insightflow:bella-pizza:presentation:v1' as const
export const PRESENTATION_RNG_SEED = 20260315 as const
export const PRESENTATION_PERIOD_END = '2026-08-08' as const
export const PRESENTATION_CREATED_AT = '2026-08-09T09:00:00.000Z' as const
export const PRESENTATION_WEEKS = 12 as const

const PRESENTATION_DAYS = PRESENTATION_WEEKS * 7
const MILLISECONDS_PER_DAY = 86_400_000

interface MenuItem {
  key: string
  name: string
  category?: string
  unitPrice: number
  weight: number
}

export interface PresentationSalesLine {
  entityKey: string
  row: SalesRow
}

const MENU: MenuItem[] = [
  { key: 'margherita', name: 'Margherita Pizza', category: 'Mains', unitPrice: 9.5, weight: 17 },
  { key: 'pepperoni', name: 'Pepperoni Pizza', category: 'Mains', unitPrice: 11, weight: 15 },
  { key: 'lasagne', name: 'Lasagne', category: 'Mains', unitPrice: 12.5, weight: 8 },
  { key: 'grilled-chicken', name: 'Grilled Chicken', category: 'Mains', unitPrice: 13, weight: 7 },
  { key: 'lunch-slice', name: 'Lunch Slice', category: 'Mains', unitPrice: 5.5, weight: 6 },
  { key: 'garlic-bread', name: 'Garlic Bread', category: 'Sides', unitPrice: 4, weight: 12 },
  { key: 'house-fries', name: 'House Fries', category: 'Sides', unitPrice: 3, weight: 19 },
  { key: 'feta-flatbread', name: 'Olive, Herb & Feta Flatbread', category: 'Sides', unitPrice: 7.5, weight: 1.25 },
  { key: 'beetroot-salad', name: 'Beetroot & Feta Salad', category: 'Sides', unitPrice: 8.5, weight: 0.55 },
  { key: 'still-water', name: 'Still Water', category: 'Drinks', unitPrice: 2, weight: 8 },
  { key: 'soft-drink', name: 'Soft Drink', category: 'Drinks', unitPrice: 2.5, weight: 13 },
  { key: 'house-wine', name: 'House Wine (glass)', category: 'Drinks', unitPrice: 6, weight: 8 },
  { key: 'tiramisu', name: 'Tiramisu', category: 'Desserts', unitPrice: 6.5, weight: 5 },
  { key: 'gelato', name: 'Gelato', category: 'Desserts', unitPrice: 4.5, weight: 4 },
  { key: 'pumpkin-soup', name: 'Roasted Pumpkin Soup', category: 'Seasonal', unitPrice: 7, weight: 1.4 },
  { key: 'chefs-special', name: "Chef's Special", unitPrice: 10, weight: 0.65 }
]

// Sunday first. Each generated row is one item's daily till total, matching the
// data-set preview and the existing demo seed rather than inventing transactions
// the CSV contract has no transaction id with which to distinguish.
const DAILY_DEMAND_FACTORS = [0.92, 0.85, 0.8, 0.88, 0.95, 1.3, 1.3] as const

// Two recent gaps make the outcome quality warning real without making the
// overall twelve-week data set too thin to analyse.
const MISSING_DAY_OFFSETS = new Set([72, 78])

function parseDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function shiftCalendarDay(date: string, days: number): string {
  return new Date(parseDay(date).getTime() + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10)
}

export const PRESENTATION_PERIOD_START = shiftCalendarDay(
  PRESENTATION_PERIOD_END,
  -(PRESENTATION_DAYS - 1)
)

/** Mulberry32 with an isolated unsigned 32-bit state for every build. */
export function makePresentationRandom(seed = PRESENTATION_RNG_SEED): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function presentationObjectId(entityType: string, entityKey: string): string {
  return createHash('sha256')
    .update(`${PRESENTATION_SEED_ID}\0${entityType}\0${entityKey}`)
    .digest('hex')
    .slice(0, 24)
}

export const PRESENTATION_DATASET_KEY = 'dataset:bella-pizza:12-weeks' as const
export const PRESENTATION_DATASET_ID = presentationObjectId('dataset', PRESENTATION_DATASET_KEY)

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function itemWeight(item: MenuItem, dayOffset: number): number {
  if (item.key === 'pumpkin-soup' && dayOffset >= 49) return 0
  if (item.key === 'lunch-slice' && dayOffset < 69) return 0

  if (dayOffset >= 69) {
    if (item.key === 'margherita') return item.weight * 1.45
    if (item.key === 'beetroot-salad') return item.weight * 0.45
    if (item.key === 'lasagne') return item.weight * 1.17
    if (item.key === 'garlic-bread') return item.weight * 1.02
  }

  return item.weight
}

function quantityFor(
  random: () => number,
  item: MenuItem,
  dayOffset: number,
  weekday: number
): number {
  const baseQuantity = itemWeight(item, dayOffset)
  if (baseQuantity === 0) return 0

  const trend = 0.94 + (dayOffset / (PRESENTATION_DAYS - 1)) * 0.14
  const jitter = 0.92 + random() * 0.16
  // A zero means this low-volume item did not sell that day. The importer and
  // the existing aggregate seed both represent that by omitting the row.
  return Math.max(0, Math.round(baseQuantity * DAILY_DEMAND_FACTORS[weekday]! * trend * jitter))
}

function unitPriceFor(item: MenuItem, weekday: number): number {
  if (weekday === 2 && item.key === 'margherita') return 8.55
  if (weekday === 5 && item.key === 'house-wine') return 5.5
  return item.unitPrice
}

export function buildPresentationSalesLines(
  datasetId = PRESENTATION_DATASET_ID
): PresentationSalesLine[] {
  const random = makePresentationRandom()
  const lines: PresentationSalesLine[] = []

  for (let dayOffset = 0; dayOffset < PRESENTATION_DAYS; dayOffset++) {
    if (MISSING_DAY_OFFSETS.has(dayOffset)) continue

    const date = shiftCalendarDay(PRESENTATION_PERIOD_START, dayOffset)
    const weekday = parseDay(date).getUTCDay()

    for (const item of MENU) {
      const quantity = quantityFor(random, item, dayOffset, weekday)
      if (quantity === 0) continue

      const unitPrice = unitPriceFor(item, weekday)
      const entityKey = `sales-row:${date}:${item.key}`
      const candidate = {
        id: presentationObjectId('sales-row', entityKey),
        datasetId,
        date,
        itemName: item.name,
        ...(item.category ? { category: item.category } : {}),
        quantity,
        unitPrice,
        revenue: roundMoney(quantity * unitPrice)
      }

      const parsed = salesRowSchema.safeParse(candidate)
      if (!parsed.success) {
        throw new Error(
          `Presentation row ${entityKey} is invalid: ${parsed.error.issues[0]?.message ?? 'Unknown validation error.'}`
        )
      }

      lines.push({ entityKey, row: parsed.data })
    }
  }

  return lines
}

export function presentationSalesDigest(lines = buildPresentationSalesLines()): string {
  return createHash('sha256').update(JSON.stringify(lines)).digest('hex')
}

export function presentationSalesSummary(lines = buildPresentationSalesLines()) {
  const rows = lines.map(line => line.row)
  const dates = [...new Set(rows.map(row => row.date))].sort((a, b) => a.localeCompare(b))
  const categories = [...new Set(rows.map(row => row.category ?? 'Uncategorised'))]
    .sort((a, b) => a.localeCompare(b))

  return {
    digest: presentationSalesDigest(lines),
    rowCount: rows.length,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
    tradingDays: dates.length,
    distinctItems: new Set(rows.map(row => row.itemName)).size,
    categories
  }
}
