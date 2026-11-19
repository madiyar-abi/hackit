// Deviation detectors: pure functions Dataset → Deviation[]. Thresholds come from EngineConfig.
import type { Dataset, Deviation } from "../types";
import type { EngineConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import {
  avgSalesWithFreezer,
  freezerPeerIndex,
  freezerPresent,
  getOutlet,
  outletFreezer,
  outletSales,
  repPlan,
  repSales,
  repVisits,
} from "../selectors";
import { fmtDate, fmtKm, fmtMoney, fmtPct, plural } from "../format";

/** Simulated detection time: the morning after the period closes (engine runs nightly). */
export const detectedAt = (period: string, minute = 0) => {
  const [y, m] = period.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return `${next}-01T07:${String(minute).padStart(2, "0")}:00+05:00`;
};

const avgOrderValue = (d: Dataset, repId: string, period: string) => {
  const done = repVisits(d, repId, period).filter((v) => v.status === "done").length;
  return done ? repSales(d, repId, period) / done : 0;
};

export function detectMissedVisits(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.reps.flatMap((rep) => {
    const vs = repVisits(d, rep.id, p);
    const missed = vs.filter((v) => v.status === "missed");
    if (missed.length === 0 || missed.length < c.missedVisitsMin) return [];
    const outletIds = [...new Set(missed.map((v) => v.outletId))];
    const impact = Math.round(missed.length * avgOrderValue(d, rep.id, d.previousPeriod));
    return [{
      id: `missed_visits-${rep.id}-${p}`,
      type: "missed_visits",
      severity: missed.length >= 5 ? "high" : "medium",
      period: p,
      title: `${rep.name}: ${outletIds.length === 1 ? "не посещена" : "не посещены"} ${plural(outletIds.length, ["плановая точка", "плановые точки", "плановых точек"])}`,
      description: `Пропущено ${missed.length} из ${vs.length} плановых визитов (${fmtPct(missed.length / vs.length)}). Порог: ${c.missedVisitsMin}.`,
      repId: rep.id,
      impact,
      metrics: { missed: missed.length, planned: vs.length, outlets: outletIds.length, outletIds: outletIds.join(",") },
      detectedAt: detectedAt(p, 1),
    } satisfies Deviation];
  });
}

export function detectSalesDrop(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.reps.flatMap((rep) => {
    const cur = repSales(d, rep.id, p);
    const prev = repSales(d, rep.id, d.previousPeriod);
    if (prev <= 0) return [];
    const drop = (prev - cur) / prev;
    if (drop < c.salesDropPct) return [];
    return [{
      id: `sales_drop-${rep.id}-${p}`,
      type: "sales_drop",
      severity: "critical",
      period: p,
      title: `${rep.name}: продажи упали на ${fmtPct(drop)}`,
      description: `${fmtMoney(cur)} против ${fmtMoney(prev)} в прошлом периоде. Порог: ${fmtPct(c.salesDropPct)}.`,
      repId: rep.id,
      impact: Math.round(prev - cur),
      metrics: { current: cur, previous: prev, dropPct: +(drop * 100).toFixed(1) },
      detectedAt: detectedAt(p, 2),
    } satisfies Deviation];
  });
}

export function detectNoFreezer(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.outlets.flatMap((o) => {
    if (!o.freezerRequired) return [];
    const f = outletFreezer(d, o.id);
    if (freezerPresent(f)) return [];
    const registered = !!f;
    const expected = avgSalesWithFreezer(d, o.type, p);
    const sales = outletSales(d, o.id, p);
    const impact = Math.round(Math.max(expected - sales, sales * c.freezerUpliftPct));
    return [{
      id: `no_freezer-${o.id}-${p}`,
      type: "no_freezer",
      severity: registered ? "critical" : "medium",
      period: p,
      title: `${o.name}: нет морозильного ларя компании`,
      description: registered
        ? `Ларь ${f!.id} числится за точкой, но при проверке ${fmtDate(f!.lastAudit!.date)} не найден.`
        : `Точка категории «${o.type}» по стандарту должна иметь ларь компании, но он не установлен.`,
      repId: o.repId,
      outletId: o.id,
      impact,
      metrics: { registered: registered ? "да" : "нет", sales: outletSales(d, o.id, p), expected: Math.round(expected) },
      detectedAt: detectedAt(p, 3),
    } satisfies Deviation];
  });
}

export function detectFreezerNoSales(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.freezers.flatMap((f) => {
    if (!freezerPresent(f)) return [];
    const sales = outletSales(d, f.outletId, p);
    if (sales > c.freezerNoSalesMax) return [];
    // Season / supply: the other freezers sell much less too → not this outlet's problem.
    const peers = freezerPeerIndex(d, p, f.outletId);
    if (peers && peers.index < 1 - c.freezerSeasonalDropPct) return [];
    const o = getOutlet(d, f.outletId);
    const prev = outletSales(d, o.id, d.previousPeriod);
    // money at risk = the outlet's own average monthly sales over the 3 previous periods
    const hist = d.periods.slice(0, d.periods.indexOf(p)).slice(-3).map((x) => outletSales(d, o.id, x));
    const impact = Math.round(hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : prev);
    return [{
      id: `freezer_no_sales-${o.id}-${p}`,
      type: "freezer_no_sales",
      severity: "high",
      period: p,
      title: `${o.name}: ларь установлен, продаж нет`,
      description: `Ларь ${f.id} (${f.model}) стоит с ${fmtDate(f.installedAt)}, продажи за период: ${fmtMoney(sales)}.`,
      repId: o.repId,
      outletId: o.id,
      impact,
      metrics: { freezerId: f.id, sales, previous: prev },
      detectedAt: detectedAt(p, 4),
    } satisfies Deviation];
  });
}

export function detectPlanUnderperformance(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.reps.flatMap((rep) => {
    const plan = repPlan(d, rep.id, p);
    if (plan <= 0) return [];
    const fact = repSales(d, rep.id, p);
    const ratio = fact / plan;
    if (ratio > c.planFulfilmentMax) return [];
    return [{
      id: `plan_underperformance-${rep.id}-${p}`,
      type: "plan_underperformance",
      severity: "critical",
      period: p,
      title: `${rep.name}: план выполнен на ${fmtPct(ratio)}`,
      description: `Факт ${fmtMoney(fact)} при плане ${fmtMoney(plan)}. Порог: ≤ ${fmtPct(c.planFulfilmentMax)}.`,
      repId: rep.id,
      impact: Math.round(plan - fact),
      metrics: { plan, fact, fulfilmentPct: +(ratio * 100).toFixed(1) },
      detectedAt: detectedAt(p, 5),
    } satisfies Deviation];
  });
}

export function detectGpsMismatch(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  const p = d.currentPeriod;
  return d.reps.flatMap((rep) => {
    const bad = repVisits(d, rep.id, p).filter((v) => v.status === "done" && (v.distanceM ?? 0) > c.gpsMaxDistanceM);
    if (bad.length === 0 || bad.length < c.gpsMismatchMin) return [];
    const maxKm = Math.max(...bad.map((v) => v.distanceM ?? 0)) / 1000;
    return [{
      id: `gps_mismatch-${rep.id}-${p}`,
      type: "gps_mismatch",
      severity: "medium",
      period: p,
      title: `${rep.name}: ${plural(bad.length, ["визит отмечен", "визита отмечены", "визитов отмечены"])} вне точки`,
      description: `GPS-отметка дальше ${c.gpsMaxDistanceM} м от точки (до ${fmtKm(maxKm * 1000)}). Визиты могли не состояться.`,
      repId: rep.id,
      impact: Math.round(bad.length * avgOrderValue(d, rep.id, d.previousPeriod)),
      metrics: { suspicious: bad.length, maxDistanceM: Math.max(...bad.map((v) => v.distanceM ?? 0)), visitIds: bad.map((v) => v.id).join(",") },
      detectedAt: detectedAt(p, 6),
    } satisfies Deviation];
  });
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 } as const;

export function detectDeviations(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Deviation[] {
  return [
    ...detectMissedVisits(d, c),
    ...detectSalesDrop(d, c),
    ...detectNoFreezer(d, c),
    ...detectFreezerNoSales(d, c),
    ...detectPlanUnderperformance(d, c),
    ...detectGpsMismatch(d, c),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.impact - a.impact);
}
