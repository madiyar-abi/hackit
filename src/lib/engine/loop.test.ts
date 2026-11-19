import { describe, expect, it } from "vitest";
import { generateDataset, SCENARIO } from "../data/generate";
import { detectDeviations } from "./detect";
import { actionOutcomes, asOfPeriod, escalation, outcomeSummary, recurringIds, SLA_HOURS } from "./loop";

const d = generateDataset();
const current = detectDeviations(d);
const outcomes = actionOutcomes(d, current);
const find = (type: string, who: string) =>
  outcomes.find((o) => o.previous.type === type && (o.previous.outletId ?? o.previous.repId) === who);

describe("as of a past period", () => {
  it("drops later data and audits made after that month", () => {
    const sep = asOfPeriod(d, d.previousPeriod);
    expect(sep.currentPeriod).toBe("2026-09");
    expect(sep.sales.every((s) => s.period <= "2026-09")).toBe(true);
    // the audit of 14.10 that found the freezer missing was not known in September
    expect(sep.freezers.find((f) => f.outletId === SCENARIO.missingFreezerOutlet)?.lastAudit).toBeUndefined();
  });
});

describe("outcomes of last month's deviations", () => {
  it("September missed visits are resolved and the rep's sales recovered", () => {
    const o = find("missed_visits", SCENARIO.prevMissedVisitsRep)!;
    expect(o.status).toBe("resolved");
    expect(o.salesDelta).toBeGreaterThan(0);
  });
  it("September freezer without sales is resolved, the outlet sells again", () => {
    const o = find("freezer_no_sales", SCENARIO.prevFreezerNoSalesOutlet)!;
    expect(o.status).toBe("resolved");
    expect(o.salesDelta).toBeGreaterThan(0);
  });
  it("the new rep's plan problem and the outlet without a freezer persist", () => {
    expect(find("plan_underperformance", SCENARIO.planRep)?.status).toBe("persisting");
    expect(find("no_freezer", SCENARIO.noFreezerOutlet)?.status).toBe("persisting");
  });
  it("summary counts recovered sales only for resolved deviations", () => {
    const s = outcomeSummary(outcomes);
    expect(s.resolved + s.persisting).toBe(s.total);
    expect(s.recoveredSales).toBeGreaterThan(0);
  });
  it("persisting deviations mark the current alerts as recurring", () => {
    const ids = recurringIds(outcomes);
    expect([...ids].sort()).toEqual(outcomes.filter((o) => o.currentId).map((o) => o.currentId).sort());
    expect(ids.has(`plan_underperformance-${SCENARIO.planRep}-${d.currentPeriod}`)).toBe(true);
  });
});

describe("escalation", () => {
  const at = "2026-11-01T07:00:00+05:00";
  const hoursLater = (h: number) => new Date(Date.parse(at) + h * 3_600_000).toISOString();
  it("waits within the SLA, escalates after it", () => {
    expect(escalation({ severity: "high", detectedAt: at }, { handled: false, recurring: false, now: hoursLater(10) }))
      .toMatchObject({ state: "waiting", hoursLeft: SLA_HOURS.high - 10 });
    expect(escalation({ severity: "critical", detectedAt: at }, { handled: false, recurring: false, now: hoursLater(25) }))
      .toMatchObject({ state: "escalated", reason: "overdue", target: "Коммерческий директор" });
  });
  it("a recurring alert is escalated at once; handling it stops the escalation", () => {
    expect(escalation({ severity: "medium", detectedAt: at }, { handled: false, recurring: true, now: hoursLater(1) }))
      .toMatchObject({ state: "escalated", reason: "recurring", target: "Руководитель отдела продаж" });
    expect(escalation({ severity: "critical", detectedAt: at }, { handled: true, recurring: true, now: hoursLater(99) }))
      .toEqual({ state: "handled" });
  });
});
