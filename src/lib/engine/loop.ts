// Closed loop: did last month's deviations go away after the actions, and who gets an escalation
// when an alert is not handled in time. Pure functions over the dataset and alerts.
import type { Dataset, Deviation, DeviationType, Severity } from "../types";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import { detectDeviations } from "./detect";
import { outletSales, repSales } from "../selectors";

/** The demo «now»: the day after the nightly check of 01.11.2026 (keeps the demo deterministic). */
export const DEMO_NOW = "2026-11-02T10:00:00+05:00";

/** Hours to react before an alert is escalated one level up. */
export const SLA_HOURS: Record<Severity, number> = { critical: 24, high: 72, medium: 120 };

const OUTLET_TYPES: DeviationType[] = ["no_freezer", "freezer_no_sales"];
const keyOf = (x: Pick<Deviation, "type" | "repId" | "outletId">) =>
  `${x.type}:${OUTLET_TYPES.includes(x.type) ? x.outletId : x.repId}`;

/**
 * The dataset as it was known at the end of `period`: later sales, plans and visits are dropped and
 * freezer audits made after that month are not known yet.
 */
export function asOfPeriod(d: Dataset, period: string): Dataset {
  const i = d.periods.indexOf(period);
  if (i < 1) throw new Error(`Need a period before ${period}`);
  const end = `${period}-31`;
  return {
    ...d,
    periods: d.periods.slice(0, i + 1),
    currentPeriod: period,
    previousPeriod: d.periods[i - 1],
    sales: d.sales.filter((s) => s.period <= period),
    plans: d.plans.filter((p) => p.period <= period),
    visits: d.visits.filter((v) => v.period <= period),
    freezers: d.freezers.map((f) =>
      f.lastAudit && f.lastAudit.date > end ? { ...f, lastAudit: undefined } : f,
    ),
  };
}

export interface Outcome {
  previous: Deviation;
  status: "resolved" | "persisting";
  /** Sales of the rep / outlet: this period minus the previous one, ₸. */
  salesDelta: number;
  currentId?: string;
}

/** Last period's deviations and what happened to them this period. */
export function actionOutcomes(d: Dataset, current: readonly Deviation[], c: EngineConfig = DEFAULT_CONFIG): Outcome[] {
  if (d.periods.indexOf(d.previousPeriod) < 1) return [];
  const before = detectDeviations(asOfPeriod(d, d.previousPeriod), c);
  const now = new Map(current.map((x) => [keyOf(x), x.id]));
  return before.map((prev) => {
    const isOutlet = OUTLET_TYPES.includes(prev.type);
    const sales = (p: string) => (isOutlet ? outletSales(d, prev.outletId!, p) : repSales(d, prev.repId, p));
    const currentId = now.get(keyOf(prev));
    return {
      previous: prev,
      status: currentId ? "persisting" : "resolved",
      salesDelta: Math.round(sales(d.currentPeriod) - sales(d.previousPeriod)),
      ...(currentId ? { currentId } : {}),
    };
  });
}

export function outcomeSummary(outcomes: readonly Outcome[]) {
  const resolved = outcomes.filter((o) => o.status === "resolved");
  return {
    total: outcomes.length,
    resolved: resolved.length,
    persisting: outcomes.length - resolved.length,
    recoveredSales: resolved.reduce((a, o) => a + Math.max(0, o.salesDelta), 0),
  };
}

/** Ids of current alerts that were already found last period (repeat → escalate right away). */
export const recurringIds = (outcomes: readonly Outcome[]) =>
  new Set(outcomes.flatMap((o) => (o.currentId ? [o.currentId] : [])));

export type Escalation =
  | { state: "handled" }
  | { state: "waiting"; hoursLeft: number; target: string }
  | { state: "escalated"; reason: "overdue" | "recurring"; hoursOpen: number; target: string };

/** Who gets the escalation: critical alerts already go to the head of sales → next level up. */
export const escalationTarget = (s: Severity) =>
  s === "critical" ? "Коммерческий директор" : "Руководитель отдела продаж";

export function escalation(
  alert: Pick<Deviation, "severity" | "detectedAt">,
  opts: { handled: boolean; recurring: boolean; now?: string },
): Escalation {
  if (opts.handled) return { state: "handled" };
  const hoursOpen = Math.max(0, Math.floor((Date.parse(opts.now ?? DEMO_NOW) - Date.parse(alert.detectedAt)) / 3_600_000));
  const target = escalationTarget(alert.severity);
  if (opts.recurring) return { state: "escalated", reason: "recurring", hoursOpen, target };
  const left = SLA_HOURS[alert.severity] - hoursOpen;
  return left > 0
    ? { state: "waiting", hoursLeft: left, target }
    : { state: "escalated", reason: "overdue", hoursOpen, target };
}
