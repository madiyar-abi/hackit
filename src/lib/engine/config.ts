// Thresholds of the deviation engine. Change here — detectors, causes and UI read from this object.
export interface EngineConfig {
  /** Rep has at least this many missed planned visits in the period. */
  missedVisitsMin: number;
  /** Rep's sales dropped by at least this share vs the previous period (0.3 = 30%). */
  salesDropPct: number;
  /** Rep's plan fulfilment at or below this share (0.5 = 50%). */
  planFulfilmentMax: number;
  /** Outlet with a freezer is "without sales" when its period sales are at or below this amount, ₸. */
  freezerNoSalesMax: number;
  /** Check-in farther than this from the outlet is suspicious, metres. */
  gpsMaxDistanceM: number;
  /** Rep has at least this many suspicious check-ins in the period. */
  gpsMismatchMin: number;
  /** Visit frequency drop (done visits vs previous period) treated as a cause. */
  visitDropPct: number;
  /** Extra sales a company freezer brings to an outlet (share of the outlet's sales). */
  freezerUpliftPct: number;
  /** Rep is "new" for this many months after hiring. */
  newRepMonths: number;
  /** Plan is "inflated" when it exceeds last period's fact by more than this share. */
  planInflationPct: number;
  /**
   * Seasonality guard: if the other freezer outlets sell less than (1 − this share) of their 3-month
   * average, a freezer without sales is the season / supply, not the outlet — no per-outlet alert.
   */
  freezerSeasonalDropPct: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  missedVisitsMin: 3,
  salesDropPct: 0.3,
  planFulfilmentMax: 0.5,
  freezerNoSalesMax: 0,
  gpsMaxDistanceM: 300,
  gpsMismatchMin: 2,
  visitDropPct: 0.2,
  freezerUpliftPct: 0.25,
  newRepMonths: 3,
  planInflationPct: 0.3,
  freezerSeasonalDropPct: 0.5,
};
