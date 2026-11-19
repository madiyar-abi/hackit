import { describe, expect, it } from "vitest";
import type { DeviationType } from "../types";
import { riskSummary } from "./risk";

const a = (type: DeviationType, repId: string, impact: number, outletId?: string) => ({ type, repId, impact, outletId });

describe("riskSummary", () => {
  it("keeps the plan gap apart from lost sales", () => {
    const r = riskSummary([a("plan_underperformance", "r1", 1000), a("sales_drop", "r2", 300)]);
    expect(r).toEqual({ lostSales: 300, planGap: 1000 });
  });

  it("counts overlapping losses of one rep once (largest estimate)", () => {
    const r = riskSummary([
      a("missed_visits", "r1", 600),
      a("sales_drop", "r1", 900),
      a("gps_mismatch", "r1", 200),
      a("freezer_no_sales", "r1", 400, "o1"),
    ]);
    expect(r.lostSales).toBe(900);
  });

  it("sums outlet losses of one rep when they exceed the rep-level estimate", () => {
    const r = riskSummary([
      a("missed_visits", "r1", 500),
      a("no_freezer", "r1", 300, "o1"),
      a("freezer_no_sales", "r1", 400, "o2"),
    ]);
    expect(r.lostSales).toBe(700);
  });

  it("adds up different reps", () => {
    const r = riskSummary([a("sales_drop", "r1", 100), a("no_freezer", "r2", 50, "o9"), a("gps_mismatch", "r3", 25)]);
    expect(r.lostSales).toBe(175);
  });

  it("is zero for no alerts", () => {
    expect(riskSummary([])).toEqual({ lostSales: 0, planGap: 0 });
  });
});
