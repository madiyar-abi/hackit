import type { Alert } from "../types";

type RiskInput = Pick<Alert, "type" | "repId" | "impact">;

export interface RiskSummary {
  /** Lost sales per month, each loss counted once. */
  lostSales: number;
  /** Gap to the sales plan per month — a target shortfall, not a loss; shown separately. */
  planGap: number;
}

const OUTLET_LEVEL = new Set<Alert["type"]>(["no_freezer", "freezer_no_sales"]);

/**
 * Money at risk without double counting. One rep's sales drop, missed visits, off-site check-ins
 * and idle freezers can describe the same lost sales, so per rep we take the largest estimate:
 * max(largest rep-level loss, sum of outlet-level losses). The plan gap is reported apart.
 */
export function riskSummary(alerts: readonly RiskInput[]): RiskSummary {
  let planGap = 0;
  const byRep = new Map<string, { rep: number; outlets: number }>();
  for (const a of alerts) {
    if (a.type === "plan_underperformance") {
      planGap += a.impact;
      continue;
    }
    const r = byRep.get(a.repId) ?? { rep: 0, outlets: 0 };
    if (OUTLET_LEVEL.has(a.type)) r.outlets += a.impact;
    else r.rep = Math.max(r.rep, a.impact);
    byRep.set(a.repId, r);
  }
  let lostSales = 0;
  for (const r of byRep.values()) lostSales += Math.max(r.rep, r.outlets);
  return { lostSales, planGap };
}
