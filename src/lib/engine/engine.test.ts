import { describe, expect, it } from "vitest";
import { generateDataset, SCENARIO } from "../data/generate";
import type { Dataset, DeviationType } from "../types";
import { DEFAULT_CONFIG } from "./config";
import {
  detectDeviations,
  detectFreezerNoSales,
  detectGpsMismatch,
  detectMissedVisits,
  detectNoFreezer,
  detectPlanUnderperformance,
  detectSalesDrop,
} from "./detect";
import { analyze } from ".";
import { buildNotifications, dailyDigest, renderMessage } from "./notify";

const d = generateDataset();
const clone = (): Dataset => structuredClone(d);

describe("detectors on the demo dataset", () => {
  it("missed visits → only the rep with 5 missed outlets", () => {
    const xs = detectMissedVisits(d);
    expect(xs.map((x) => x.repId)).toEqual([SCENARIO.missedVisitsRep]);
    expect(xs[0].metrics.outlets).toBe(5);
  });

  it("sales drop ≥30% → only the dropping rep", () => {
    const xs = detectSalesDrop(d);
    expect(xs.map((x) => x.repId)).toEqual([SCENARIO.salesDropRep]);
    expect(Number(xs[0].metrics.dropPct)).toBeGreaterThanOrEqual(30);
  });

  it("no freezer → outlet without one and outlet whose freezer is missing", () => {
    const xs = detectNoFreezer(d);
    expect(xs.map((x) => x.outletId).sort()).toEqual([SCENARIO.noFreezerOutlet, SCENARIO.missingFreezerOutlet].sort());
    expect(xs.find((x) => x.outletId === SCENARIO.missingFreezerOutlet)?.severity).toBe("critical");
  });

  it("freezer without sales → both planted outlets", () => {
    const xs = detectFreezerNoSales(d);
    expect(xs.map((x) => x.outletId).sort()).toEqual([SCENARIO.freezerNoSalesOutlet, SCENARIO.freezerClosedOutlet].sort());
  });

  it("plan ≤50% → only the new rep", () => {
    const xs = detectPlanUnderperformance(d);
    expect(xs.map((x) => x.repId)).toEqual([SCENARIO.planRep]);
    expect(Number(xs[0].metrics.fulfilmentPct)).toBeLessThanOrEqual(50);
  });

  it("GPS mismatch → the rep with check-ins far from outlets", () => {
    expect(detectGpsMismatch(d).map((x) => x.repId)).toEqual([SCENARIO.gpsRep]);
  });

  it("all 5 case types are present, sorted by severity", () => {
    const xs = detectDeviations(d);
    const types = new Set<DeviationType>(xs.map((x) => x.type));
    for (const t of ["missed_visits", "sales_drop", "no_freezer", "freezer_no_sales", "plan_underperformance"] as const)
      expect(types.has(t)).toBe(true);
    const rank = { critical: 0, high: 1, medium: 2 };
    expect(xs.map((x) => rank[x.severity])).toEqual([...xs.map((x) => rank[x.severity])].sort());
    expect(new Set(xs.map((x) => x.id)).size).toBe(xs.length);
  });
});

describe("thresholds come from config", () => {
  it("missed visits threshold", () => {
    expect(detectMissedVisits(d, { ...DEFAULT_CONFIG, missedVisitsMin: 6 })).toHaveLength(0);
    expect(detectMissedVisits(d, { ...DEFAULT_CONFIG, missedVisitsMin: 1 }).length).toBeGreaterThan(1);
  });
  it("sales drop threshold", () => {
    expect(detectSalesDrop(d, { ...DEFAULT_CONFIG, salesDropPct: 0.5 })).toHaveLength(0);
  });
  it("plan threshold", () => {
    expect(detectPlanUnderperformance(d, { ...DEFAULT_CONFIG, planFulfilmentMax: 0.4 })).toHaveLength(0);
    expect(detectPlanUnderperformance(d, { ...DEFAULT_CONFIG, planFulfilmentMax: 0.65 }).length).toBe(2);
  });
  it("gps threshold", () => {
    expect(detectGpsMismatch(d, { ...DEFAULT_CONFIG, gpsMaxDistanceM: 10_000 })).toHaveLength(0);
  });
});

describe("detectors react to data changes", () => {
  it("installing a freezer clears the no-freezer alert", () => {
    const x = clone();
    x.freezers.push({ id: "fX", outletId: SCENARIO.noFreezerOutlet, model: "T", installedAt: "2026-10-01" });
    expect(detectNoFreezer(x).map((a) => a.outletId)).not.toContain(SCENARIO.noFreezerOutlet);
  });
  it("a sale at the outlet clears freezer-without-sales", () => {
    const x = clone();
    x.sales.find((s) => s.outletId === SCENARIO.freezerNoSalesOutlet && s.period === x.currentPeriod)!.amount = 50_000;
    expect(detectFreezerNoSales(x).map((a) => a.outletId)).not.toContain(SCENARIO.freezerNoSalesOutlet);
  });
  it("marking missed visits as done clears the missed-visits alert", () => {
    const x = clone();
    x.visits.forEach((v) => (v.status = "done"));
    expect(detectMissedVisits(x)).toHaveLength(0);
  });
});

describe("causes and actions", () => {
  const alerts = analyze(d);
  const byType = (t: DeviationType) => alerts.filter((a) => a.type === t);

  it("every alert has at least one cause with evidence and an action", () => {
    for (const a of alerts) {
      expect(a.causes.length).toBeGreaterThan(0);
      expect(a.causes.every((c) => c.evidence.length > 0)).toBe(true);
      expect(a.actions.length).toBeGreaterThan(0);
    }
  });
  it("sales drop → reduced visit frequency and lost outlets", () => {
    const titles = byType("sales_drop")[0].causes.map((c) => c.title);
    expect(titles).toContain("Снизилась частота визитов");
    expect(titles.some((t) => t.startsWith("Потеряны точки"))).toBe(true);
  });
  it("freezer without sales → competitor product / closed outlet", () => {
    const titles = byType("freezer_no_sales").flatMap((a) => a.causes.map((c) => c.title));
    expect(titles).toContain("Ларь используется под продукцию конкурента");
    expect(titles).toContain("Точка закрыта / не работает");
  });
  it("closed outlet → move the freezer to the outlet without one", () => {
    const a = byType("freezer_no_sales").find((x) => x.outletId === SCENARIO.freezerClosedOutlet)!;
    expect(a.actions.some((s) => s.includes(d.outlets.find((o) => o.id === SCENARIO.noFreezerOutlet)!.name))).toBe(true);
  });
  it("plan ≤50% → new employee and low order per visit, mentor without alerts", () => {
    const a = byType("plan_underperformance")[0];
    const titles = a.causes.map((c) => c.title);
    expect(titles).toContain("Новый сотрудник — период адаптации");
    expect(titles).toContain("Низкий средний заказ на визит");
    expect(a.actions[0]).not.toContain(d.reps.find((r) => r.id === SCENARIO.gpsRep)!.name);
  });
  it("missing freezer → asset lost", () => {
    const a = byType("no_freezer").find((x) => x.outletId === SCENARIO.missingFreezerOutlet)!;
    expect(a.causes[0].title).toBe("Ларь компании вывезен или утерян");
  });
});

describe("notifications", () => {
  const alerts = analyze(d);
  const ns = buildNotifications(alerts, d);

  it("critical alerts go to the head of sales by Telegram and e-mail", () => {
    const crit = alerts.filter((a) => a.severity === "critical");
    for (const a of crit) {
      const to = ns.filter((n) => n.alertId === a.id);
      expect(to.some((n) => n.recipientId === "m1" && n.channel === "telegram")).toBe(true);
      expect(to.some((n) => n.recipientId === "m1" && n.channel === "email")).toBe(true);
    }
  });
  it("every alert produces at least one message", () => {
    for (const a of alerts) expect(ns.some((n) => n.alertId === a.id)).toBe(true);
  });
  it("message text contains title, money at risk, cause and action for each type", () => {
    for (const a of alerts) {
      const { text, subject } = renderMessage(a, d, "telegram");
      expect(subject).toContain(a.title);
      expect(text).toContain(a.title);
      expect(text).toContain("Под угрозой:");
      expect(text).toContain(`Вероятная причина: ${a.causes[0].title}`);
      expect(text).toContain(`Что сделать: ${a.actions[0]}`);
    }
  });
  it("digest counts alerts", () => {
    expect(dailyDigest(alerts, d)).toContain(`Отклонений: ${alerts.length}`);
  });
});
