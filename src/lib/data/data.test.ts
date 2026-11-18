import { describe, expect, it } from "vitest";
import { generateDataset, SCENARIO } from "./generate";
import { outletFreezer, outletSales, repPlan, repSales, repVisits } from "../selectors";

const d = generateDataset();

describe("demo dataset", () => {
  it("is deterministic", () => {
    expect(JSON.stringify(generateDataset())).toBe(JSON.stringify(d));
  });

  it("has the required size", () => {
    expect(d.reps.length).toBeGreaterThanOrEqual(10);
    expect(d.outlets.length).toBeGreaterThanOrEqual(100);
    expect(d.periods.length).toBeGreaterThanOrEqual(2);
    expect(d.visits.every((v) => v.status === "missed" || (v.gps && v.checkInTime))).toBe(true);
  });

  it("case 1: a rep missed 5 planned outlets", () => {
    const missed = repVisits(d, SCENARIO.missedVisitsRep, d.currentPeriod).filter((v) => v.status === "missed");
    expect(new Set(missed.map((v) => v.outletId)).size).toBe(5);
  });

  it("case 2: a rep's sales fell by ≥30%", () => {
    const cur = repSales(d, SCENARIO.salesDropRep, d.currentPeriod);
    const prev = repSales(d, SCENARIO.salesDropRep, d.previousPeriod);
    expect((prev - cur) / prev).toBeGreaterThanOrEqual(0.3);
  });

  it("case 3: an outlet has no company freezer", () => {
    expect(outletFreezer(d, SCENARIO.noFreezerOutlet)).toBeUndefined();
    expect(outletFreezer(d, SCENARIO.missingFreezerOutlet)?.lastAudit?.found).toBe(false);
  });

  it("case 4: an outlet has a freezer but no sales", () => {
    expect(outletFreezer(d, SCENARIO.freezerNoSalesOutlet)).toBeDefined();
    expect(outletSales(d, SCENARIO.freezerNoSalesOutlet, d.currentPeriod)).toBe(0);
  });

  it("case 5: a rep fulfils ~50% of the plan", () => {
    const ratio = repSales(d, SCENARIO.planRep, d.currentPeriod) / repPlan(d, SCENARIO.planRep, d.currentPeriod);
    expect(ratio).toBeLessThanOrEqual(0.5);
    expect(ratio).toBeGreaterThan(0.4);
  });
});
