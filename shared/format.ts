/**
 * Every figure in the product is formatted here, so the public feed and the private
 * workspace never disagree about how a number looks.
 */

const MONEY = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const COUNT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

/** Money always shows both pence: £1,234.50, never £1,234.5. */
export function formatMoney(value: number): string {
  return MONEY.format(value)
}

/** Whole things — orders, covers, units sold. Never fractional. */
export function formatCount(value: number): string {
  return COUNT.format(value)
}

/**
 * A change is always signed and always to one decimal place: +32.7%, -18.5%, 0.0%.
 * The sign is the point, so it is never dropped.
 */
export function formatPercentChange(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export type ChangeDirection = 'up' | 'down' | 'flat'

/** Values within a twentieth of a percent read as flat rather than as noise. */
export function changeDirection(value: number): ChangeDirection {
  if (value > 0.05) return 'up'
  if (value < -0.05) return 'down'
  return 'flat'
}
