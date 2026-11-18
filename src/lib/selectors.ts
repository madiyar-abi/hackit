// Pure helpers over the dataset, shared by the engine and the UI.
import type { Dataset, Freezer, Outlet, Rep, Visit } from "./types";

export const repSales = (d: Dataset, repId: string, period: string) =>
  d.sales.filter((s) => s.repId === repId && s.period === period).reduce((a, s) => a + s.amount, 0);

export const outletSales = (d: Dataset, outletId: string, period: string) =>
  d.sales.find((s) => s.outletId === outletId && s.period === period)?.amount ?? 0;

export const repPlan = (d: Dataset, repId: string, period: string) =>
  d.plans.find((p) => p.repId === repId && p.period === period)?.plan ?? 0;

export const totalSales = (d: Dataset, period: string) =>
  d.sales.filter((s) => s.period === period).reduce((a, s) => a + s.amount, 0);

export const totalPlan = (d: Dataset, period: string) =>
  d.plans.filter((p) => p.period === period).reduce((a, p) => a + p.plan, 0);

export const repVisits = (d: Dataset, repId: string, period: string): Visit[] =>
  d.visits.filter((v) => v.repId === repId && v.period === period);

export const outletVisits = (d: Dataset, outletId: string, period?: string): Visit[] =>
  d.visits.filter((v) => v.outletId === outletId && (!period || v.period === period));

export const repOutlets = (d: Dataset, repId: string): Outlet[] => d.outlets.filter((o) => o.repId === repId);

export const outletFreezer = (d: Dataset, outletId: string): Freezer | undefined =>
  d.freezers.find((f) => f.outletId === outletId);

/** Freezer is physically present (registered and not reported missing by the last audit). */
export const freezerPresent = (f: Freezer | undefined) => !!f && f.lastAudit?.found !== false;

export const getRep = (d: Dataset, id: string): Rep => {
  const r = d.reps.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rep ${id}`);
  return r;
};

export const getOutlet = (d: Dataset, id: string): Outlet => {
  const o = d.outlets.find((x) => x.id === id);
  if (!o) throw new Error(`Unknown outlet ${id}`);
  return o;
};

/** Average monthly sales per outlet of the given type that has a working freezer, current period. */
export const avgSalesWithFreezer = (d: Dataset, type: Outlet["type"], period: string) => {
  const xs = d.outlets
    .filter((o) => o.type === type && freezerPresent(outletFreezer(d, o.id)))
    .map((o) => outletSales(d, o.id, period))
    .filter((a) => a > 0);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
};

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
