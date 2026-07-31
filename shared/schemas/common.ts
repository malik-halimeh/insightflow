import { z } from 'zod'

/**
 * Shared primitives. Every schema in this folder builds on these so a rule is
 * stated once and changed in one place.
 */

// MongoDB ObjectId rendered as a 24-character hex string. Relax this to
// z.string().min(1) if the team ever stores ids that are not ObjectIds.
export const idSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'We could not identify this record. Please refresh the page and try again.')

// Calendar day, e.g. "2026-03-15". Used for business dates that a spreadsheet
// supplies, where a time of day would be meaningless.
export const isoDateSchema = z.iso.date({
  error: 'Please enter a date in the form YYYY-MM-DD, for example 2026-03-15.'
})

// Full timestamp, e.g. "2026-03-15T09:30:00.000Z". Used for record keeping.
export const isoDateTimeSchema = z.iso.datetime({
  error: 'Please provide a complete date and time.'
})
