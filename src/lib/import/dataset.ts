// CSV files (1С / SFA export) ⇄ Dataset. Pure functions: used by the /import page in the browser and by tests.
import { distanceM } from "../geo";
import type { Dataset, Freezer, Manager, Outlet, OutletType, Rep, RepPlan, SalesRecord, Visit } from "../types";
import { parseCsv, toCsv, type Row } from "./csv";

export interface FileSpec {
  name: string;
  label: string;
  required: boolean;
  columns: string[];
  requiredColumns: string[];
}

export const FILE_SPECS: FileSpec[] = [
  {
    name: "reps", label: "Торговые представители", required: true,
    columns: ["id", "name", "district", "supervisor_id", "hired_at", "phone"],
    requiredColumns: ["id", "name"],
  },
  {
    name: "outlets", label: "Торговые точки", required: true,
    columns: ["id", "name", "type", "address", "district", "rep_id", "lat", "lng", "freezer_required"],
    requiredColumns: ["id", "name", "rep_id"],
  },
  {
    name: "sales", label: "Продажи (отгрузки) по месяцам", required: true,
    columns: ["outlet_id", "rep_id", "period", "amount", "orders"],
    requiredColumns: ["outlet_id", "period", "amount"],
  },
  {
    name: "plans", label: "План продаж по сотрудникам", required: false,
    columns: ["rep_id", "period", "plan"],
    requiredColumns: ["rep_id", "period", "plan"],
  },
  {
    name: "visits", label: "Плановые и фактические визиты", required: false,
    columns: ["id", "rep_id", "outlet_id", "date", "planned_time", "status", "check_in_time", "lat", "lng", "distance_m", "note"],
    requiredColumns: ["rep_id", "outlet_id", "date", "status"],
  },
  {
    name: "freezers", label: "Морозильные лари и проверки", required: false,
    columns: ["id", "outlet_id", "model", "installed_at", "audit_date", "audit_found", "our_share_pct", "competitor_product", "audit_note"],
    requiredColumns: ["id", "outlet_id"],
  },
  {
    name: "managers", label: "Руководители (кому уведомления)", required: false,
    columns: ["id", "name", "role", "telegram", "email"],
    requiredColumns: ["id", "name", "role"],
  },
];

export interface ImportResult {
  dataset?: Dataset;
  errors: string[];
  warnings: string[];
}

const OUTLET_TYPES: OutletType[] = ["супермаркет", "магазин", "минимаркет", "киоск"];
const MAX_WARNINGS = 30;

const num = (s: string | undefined) => {
  if (s === undefined || s === "") return NaN;
  return Number(s.replace(/[\s ]/g, "").replace(",", "."));
};
const bool = (s: string | undefined) => /^(1|да|д|true|yes|y|истина)$/i.test((s ?? "").trim());
const isPeriod = (s: string) => /^\d{4}-\d{2}$/.test(s);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
/** «01.10.2026» → «2026-10-01»; ISO dates pass through. */
const normDate = (s: string) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.trim();
};
/** «10.2026» / «2026-10-01» → «2026-10». */
const normPeriod = (s: string) => {
  const t = s.trim();
  const m = /^(\d{2})\.(\d{4})$/.exec(t);
  if (m) return `${m[2]}-${m[1]}`;
  return isDate(normDate(t)) ? normDate(t).slice(0, 7) : t;
};

/** Match uploaded file names («Продажи_sales.csv», «sales.CSV») to the spec names. */
export function matchFiles(files: { name: string; text: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) {
    const base = f.name.toLowerCase().replace(/\.csv$/, "");
    const spec = FILE_SPECS.find((s) => base === s.name || base.endsWith(`_${s.name}`) || base.endsWith(`-${s.name}`));
    if (spec) out[spec.name] = f.text;
  }
  return out;
}

export function buildDataset(files: Record<string, string>, company = "Загруженные данные"): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const warn = (msg: string) => {
    if (warnings.length < MAX_WARNINGS) warnings.push(msg);
    else if (warnings.length === MAX_WARNINGS) warnings.push("…и другие предупреждения (показаны первые 30)");
  };

  const tables: Record<string, Row[]> = {};
  for (const spec of FILE_SPECS) {
    const text = files[spec.name];
    if (text === undefined) {
      if (spec.required) errors.push(`Нет файла ${spec.name}.csv (${spec.label})`);
      tables[spec.name] = [];
      continue;
    }
    const rows = parseCsv(text);
    const present = new Set(Object.keys(rows[0] ?? {}));
    const missing = spec.requiredColumns.filter((c) => !present.has(c));
    if (rows.length && missing.length) errors.push(`${spec.name}.csv: нет колонок ${missing.join(", ")}`);
    if (!rows.length && spec.required) errors.push(`${spec.name}.csv: файл пустой`);
    tables[spec.name] = rows;
  }
  if (errors.length) return { errors, warnings };

  const reps: Rep[] = tables.reps.map((r) => ({
    id: r.id,
    name: r.name,
    district: r.district ?? "",
    supervisorId: r.supervisor_id || "s1",
    hiredAt: normDate(r.hired_at ?? ""),
    phone: r.phone ?? "",
  }));
  const repIds = new Set(reps.map((r) => r.id));

  const outlets: Outlet[] = [];
  tables.outlets.forEach((r, i) => {
    if (!repIds.has(r.rep_id)) return warn(`outlets.csv, строка ${i + 2}: неизвестный rep_id «${r.rep_id}» — точка пропущена`);
    const type = (r.type ?? "").toLowerCase() as OutletType;
    outlets.push({
      id: r.id,
      name: r.name,
      type: OUTLET_TYPES.includes(type) ? type : "магазин",
      address: r.address ?? "",
      district: r.district ?? "",
      repId: r.rep_id,
      lat: num(r.lat) || 0,
      lng: num(r.lng) || 0,
      freezerRequired: bool(r.freezer_required),
    });
  });
  const outletById = new Map(outlets.map((o) => [o.id, o]));

  const sales: SalesRecord[] = [];
  tables.sales.forEach((r, i) => {
    const o = outletById.get(r.outlet_id);
    const period = normPeriod(r.period);
    const amount = num(r.amount);
    if (!o) return warn(`sales.csv, строка ${i + 2}: неизвестная точка «${r.outlet_id}» — пропущено`);
    if (!isPeriod(period) || Number.isNaN(amount)) return warn(`sales.csv, строка ${i + 2}: неверный период или сумма — пропущено`);
    sales.push({ outletId: o.id, repId: repIds.has(r.rep_id) ? r.rep_id : o.repId, period, amount, orders: num(r.orders) || 0 });
  });

  const plans: RepPlan[] = [];
  tables.plans.forEach((r, i) => {
    const period = normPeriod(r.period);
    const plan = num(r.plan);
    if (!repIds.has(r.rep_id) || !isPeriod(period) || Number.isNaN(plan))
      return warn(`plans.csv, строка ${i + 2}: неверная строка — пропущено`);
    plans.push({ repId: r.rep_id, period, plan });
  });

  const visits: Visit[] = [];
  tables.visits.forEach((r, i) => {
    const o = outletById.get(r.outlet_id);
    const date = normDate(r.date);
    const status = /^(done|выполнен|да|1)$/i.test(r.status) ? "done" : /^(missed|пропущен|нет|0)$/i.test(r.status) ? "missed" : null;
    if (!o || !repIds.has(r.rep_id) || !isDate(date) || !status)
      return warn(`visits.csv, строка ${i + 2}: неверная строка (точка, сотрудник, дата или статус) — пропущено`);
    const v: Visit = {
      id: r.id || `v-${i + 1}`,
      repId: r.rep_id,
      outletId: o.id,
      period: date.slice(0, 7),
      date,
      plannedTime: r.planned_time ?? "",
      status,
    };
    if (r.check_in_time) v.checkInTime = r.check_in_time;
    const lat = num(r.lat);
    const lng = num(r.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) v.gps = { lat, lng };
    const given = num(r.distance_m);
    if (!Number.isNaN(given)) v.distanceM = given;
    else if (v.gps && (o.lat || o.lng)) v.distanceM = Math.round(distanceM(o.lat, o.lng, lat, lng));
    if (r.note) v.note = r.note;
    visits.push(v);
  });

  const freezers: Freezer[] = [];
  tables.freezers.forEach((r, i) => {
    if (!outletById.has(r.outlet_id)) return warn(`freezers.csv, строка ${i + 2}: неизвестная точка «${r.outlet_id}» — пропущено`);
    const f: Freezer = { id: r.id, outletId: r.outlet_id, model: r.model ?? "", installedAt: normDate(r.installed_at ?? "") };
    const auditDate = normDate(r.audit_date ?? "");
    if (isDate(auditDate)) {
      f.lastAudit = {
        date: auditDate,
        found: r.audit_found === undefined || r.audit_found === "" ? true : bool(r.audit_found),
        ourProductSharePct: num(r.our_share_pct) || 0,
        competitorProduct: bool(r.competitor_product),
      };
      if (r.audit_note) f.lastAudit.note = r.audit_note;
    }
    freezers.push(f);
  });

  const periods = [...new Set([...sales, ...plans, ...visits].map((x) => x.period))].sort();
  if (periods.length < 2) {
    errors.push("Нужны данные минимум за 2 месяца — система сравнивает текущий период с предыдущим");
    return { errors, warnings };
  }

  const managers: Manager[] = tables.managers.length
    ? tables.managers.map((r) => ({ id: r.id, name: r.name, role: r.role, telegram: r.telegram ?? "", email: r.email ?? "" }))
    : [
        { id: "head", name: "Руководитель отдела продаж", role: "Руководитель отдела продаж", telegram: "", email: "" },
        ...[...new Set(reps.map((r) => r.supervisorId))].map((id) => ({
          id, name: `Супервайзер ${id}`, role: "Супервайзер", telegram: "", email: "",
        })),
      ];

  return {
    dataset: {
      company,
      periods,
      currentPeriod: periods[periods.length - 1],
      previousPeriod: periods[periods.length - 2],
      managers,
      reps,
      outlets,
      freezers,
      sales,
      plans,
      visits,
    },
    errors,
    warnings,
  };
}

/** Dataset → CSV files in the import format (template / export of the demo data). */
export function toCsvFiles(d: Dataset): Record<string, string> {
  const cols = (name: string) => FILE_SPECS.find((s) => s.name === name)!.columns;
  const yes = (b: boolean) => (b ? "1" : "0");
  return {
    reps: toCsv(cols("reps"), d.reps.map((r) => [r.id, r.name, r.district, r.supervisorId, r.hiredAt, r.phone])),
    outlets: toCsv(cols("outlets"), d.outlets.map((o) => [o.id, o.name, o.type, o.address, o.district, o.repId, o.lat, o.lng, yes(o.freezerRequired)])),
    sales: toCsv(cols("sales"), d.sales.map((s) => [s.outletId, s.repId, s.period, s.amount, s.orders])),
    plans: toCsv(cols("plans"), d.plans.map((p) => [p.repId, p.period, p.plan])),
    visits: toCsv(cols("visits"), d.visits.map((v) => [
      v.id, v.repId, v.outletId, v.date, v.plannedTime, v.status, v.checkInTime, v.gps?.lat, v.gps?.lng, v.distanceM, v.note,
    ])),
    freezers: toCsv(cols("freezers"), d.freezers.map((f) => [
      f.id, f.outletId, f.model, f.installedAt, f.lastAudit?.date, f.lastAudit ? yes(f.lastAudit.found) : undefined,
      f.lastAudit?.ourProductSharePct, f.lastAudit ? yes(f.lastAudit.competitorProduct) : undefined, f.lastAudit?.note,
    ])),
    managers: toCsv(cols("managers"), d.managers.map((m) => [m.id, m.name, m.role, m.telegram, m.email])),
  };
}
