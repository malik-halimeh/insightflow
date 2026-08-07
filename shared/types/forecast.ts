import type { DatasetSummary } from './analytics'

/**
 * The shape returned by GET /api/forecast/:datasetId.
 *
 * Computed on request from the current version's sales rows and never written to
 * the database, so it lives here rather than in shared/schemas and needs no Zod
 * schema — the same reasoning as AnalyticsSummary in ./analytics.ts, which this
 * deliberately mirrors so the forecast screen sits beside the dashboard without
 * either one feeling foreign.
 */

export interface ForecastPoint {
  /** Calendar day being predicted, e.g. "2026-08-14". */
  date: string
  /** The prediction itself. */
  predicted: number
  /**
   * The range the figure is honestly expected to fall within. Always drawn as a
   * band rather than a bare line: a single confident line implies a certainty that
   * four same-weekday averages cannot support.
   */
  lower: number
  upper: number
}

export interface ActualPoint {
  date: string
  revenue: number
}

/**
 * How close recent predictions turned out to be, measured by holding back known
 * days and predicting them.
 *
 * This is the number that makes the feature honest rather than decorative, so it
 * is part of the contract rather than something the screen works out for itself.
 */
export interface ForecastAccuracy {
  /**
   * Mean absolute percentage error over the held-back days, as a plain positive
   * number: 12.4 means predictions were off by 12.4% on average.
   */
  meanAbsolutePercentError: number
  /** How many days that figure was measured over. */
  daysMeasured: number
}

export interface ForecastSummary {
  dataset: DatasetSummary

  /**
   * True when there is too little history to predict from. The screen must say so
   * instead of drawing a chart — a confident line through a fortnight of trading
   * is not a small inaccuracy, it is something an owner would order stock against.
   *
   * When this is true, `points` and `accuracy` are empty and null respectively.
   */
  insufficientData: boolean
  /** Trading days actually present, so the screen can say how far short it falls. */
  activeDays: number
  /** Trading days required before a forecast is offered. Four weeks. */
  requiredDays: number

  /** The predicted days, earliest first. Empty when `insufficientData` is true. */
  points: ForecastPoint[]
  /**
   * The recent real days the prediction was built from, so the chart can draw
   * history and forecast on one continuous axis.
   */
  actuals: ActualPoint[]

  /** Null when there was not enough history to measure against. */
  accuracy: ForecastAccuracy | null

  /** How many days ahead this forecast runs. */
  horizonDays: number
  generatedAt: string
}
