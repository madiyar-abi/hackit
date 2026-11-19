// What the sales rep gets from the system (not only control): bonus forecast, a shorter route,
// hints for the outlets of the day. Pure functions, used by /mobile and tests.
import type { Dataset } from "./types";
import { distanceM } from "./geo";
import { outletFreezer, outletSales } from "./selectors";

/** Example bonus scheme (the company sets its own): nothing below 80% of plan, 50→100% of the base
 *  bonus between 80% and 100%, +2% of the base per 1% above plan, capped at 2× the base. */
export const BONUS_SCHEME = { base: 150_000, minPct: 0.8, accel: 2, cap: 2 };

export function bonusEstimate(fact: number, plan: number, s = BONUS_SCHEME) {
  const f = plan > 0 ? fact / plan : 0;
  let bonus = 0;
  if (f >= 1) bonus = Math.min(s.cap, 1 + s.accel * (f - 1)) * s.base;
  else if (f >= s.minPct) bonus = (0.5 + (0.5 * (f - s.minPct)) / (1 - s.minPct)) * s.base;
  const next = f < s.minPct ? s.minPct : f < 1 ? 1 : null;
  return {
    fulfilment: f,
    bonus: Math.round(bonus),
    nextThreshold: next,
    toNext: next === null ? 0 : Math.max(0, Math.round(next * plan - fact)),
  };
}

export interface Point {
  lat: number;
  lng: number;
}

export const routeKm = (pts: readonly Point[]) =>
  pts.slice(1).reduce((a, p, i) => a + distanceM(pts[i].lat, pts[i].lng, p.lat, p.lng), 0) / 1000;

/** Visit order (indexes) that keeps the first stop and shortens the path: nearest neighbour + 2-opt. */
export function optimizeRoute(pts: readonly Point[]): number[] {
  if (pts.length < 3) return pts.map((_, i) => i);
  const left = new Set(pts.map((_, i) => i).slice(1));
  const order = [0];
  while (left.size) {
    const last = pts[order[order.length - 1]];
    let best = -1;
    let bestD = Infinity;
    for (const i of left) {
      const dd = distanceM(last.lat, last.lng, pts[i].lat, pts[i].lng);
      if (dd < bestD) [best, bestD] = [i, dd];
    }
    order.push(best);
    left.delete(best);
  }
  const len = (o: number[]) => routeKm(o.map((i) => pts[i]));
  for (let improved = true; improved; ) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++)
      for (let k = i + 1; k < order.length; k++) {
        const next = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (len(next) < len(order) - 1e-9) {
          order.splice(0, order.length, ...next);
          improved = true;
        }
      }
  }
  return order;
}

/** City driving speed used to turn saved kilometres into minutes. */
export const CITY_KMH = 25;

/** Up to two hints per outlet of the day, from this month vs the previous one and the last freezer audit. */
export function outletHints(d: Dataset, outletIds: readonly string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of outletIds) {
    const hints: string[] = [];
    const cur = outletSales(d, id, d.currentPeriod);
    const prev = outletSales(d, id, d.previousPeriod);
    const f = outletFreezer(d, id);
    const outlet = d.outlets.find((o) => o.id === id);
    if (prev > 0 && cur / prev <= 0.9)
      hints.push(`Заказы упали на ${Math.round((1 - cur / prev) * 100)}% к прошлому месяцу — уточните причину, предложите акцию`);
    else {
      // growth vs the best of the last 3 months, so a recovery after a weak month is not called growth
      const best = Math.max(0, ...d.periods.slice(0, d.periods.indexOf(d.currentPeriod)).slice(-3).map((p) => outletSales(d, id, p)));
      if (best > 0 && cur / best >= 1.1)
        hints.push(`Заказы на ${Math.round((cur / best - 1) * 100)}% выше лучшего из 3 прошлых месяцев — предложите расширить ассортимент`);
    }
    if (f?.lastAudit?.found && f.lastAudit.ourProductSharePct < 50)
      hints.push(`В ларе только ${f.lastAudit.ourProductSharePct}% нашей продукции — восстановите выкладку`);
    if (outlet?.freezerRequired && !f) hints.push("Точке положен ларь компании — предложите установку");
    if (hints.length) out[id] = hints.slice(0, 2);
  }
  return out;
}
