import Link from "next/link";
import type { Metadata } from "next";
import type { Alert, DeviationType, Severity } from "@/lib/types";
import { alerts, dataset } from "@/lib/app-data";
import { DEFAULT_CONFIG as C } from "@/lib/engine/config";
import { SEVERITY_LABEL, TYPE_LABEL } from "@/lib/engine/notify";
import { fmtMoney, fmtPct } from "@/lib/format";
import { AlertCard } from "@/components/AlertCard";
import { PageHeader, Panel, SEVERITY_STYLE } from "@/components/ui";
import { AlertList, FoundSummary } from "@/components/Handled";
import { slim } from "@/lib/handled";

export const metadata: Metadata = { title: "Отклонения — Пульс продаж" };

type Filters = { type?: DeviationType; severity?: Severity; rep?: string };
type Params = Record<string, string | string[] | undefined>;

const TYPES = Object.keys(TYPE_LABEL) as DeviationType[];
const SEVERITIES = Object.keys(SEVERITY_LABEL) as Severity[];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(v: string | undefined, xs: readonly T[]) => xs.find((x) => x === v);

function matches(a: Alert, f: Filters) {
  return (!f.type || a.type === f.type) && (!f.severity || a.severity === f.severity) && (!f.rep || a.repId === f.rep);
}

function hrefFor(f: Filters) {
  const q = new URLSearchParams();
  if (f.type) q.set("type", f.type);
  if (f.severity) q.set("severity", f.severity);
  if (f.rep) q.set("rep", f.rep);
  const s = q.toString();
  return s ? `/alerts?${s}` : "/alerts";
}

function Chip({ href, active, count, children }: { href: string; active: boolean; count: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-ink bg-ink text-white" : "border-line bg-carton text-ink-soft hover:border-ink-soft"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {children}
      <span className={`tabular-nums ${active ? "text-white/70" : "text-muted"}`}>{count}</span>
    </Link>
  );
}

const THRESHOLDS: [string, string][] = [
  [TYPE_LABEL.missed_visits, `от ${C.missedVisitsMin} пропущенных плановых визитов за месяц`],
  [TYPE_LABEL.sales_drop, `продажи ТП упали на ${fmtPct(C.salesDropPct)} и больше к прошлому месяцу`],
  [TYPE_LABEL.plan_underperformance, `план выполнен на ${fmtPct(C.planFulfilmentMax)} или меньше`],
  [TYPE_LABEL.gps_mismatch, `отметка дальше ${C.gpsMaxDistanceM} м от точки, от ${C.gpsMismatchMin} раз за месяц`],
  [TYPE_LABEL.freezer_no_sales, `ларь стоит, а продажи точки за месяц не больше ${fmtMoney(C.freezerNoSalesMax)}`],
  [TYPE_LABEL.no_freezer, "по стандарту в точке должен быть ларь компании, а его нет"],
];

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const repParam = first(sp.rep);
  const f: Filters = {
    type: oneOf(first(sp.type), TYPES),
    severity: oneOf(first(sp.severity), SEVERITIES),
    rep: dataset.reps.some((r) => r.id === repParam) ? repParam : undefined,
  };
  const active = !!(f.type || f.severity || f.rep);
  const shown = alerts.filter((a) => matches(a, f));
  // Facet counts: each group is counted with the other active filters applied.
  const typeCount = (t: DeviationType) => alerts.filter((a) => matches(a, { ...f, type: t })).length;
  const sevCount = (s: Severity) => alerts.filter((a) => matches(a, { ...f, severity: s })).length;
  const reps = [...dataset.reps].sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <>
      <PageHeader
        title="Отклонения"
        subtitle={`Каждую ночь система проверяет визиты, продажи, планы и лари и сама находит отклонения. Срабатывает, если: пропущено от ${C.missedVisitsMin} визитов, продажи упали на ${fmtPct(C.salesDropPct)} и больше, план выполнен на ${fmtPct(C.planFulfilmentMax)} или меньше, отметка визита дальше ${C.gpsMaxDistanceM} м от точки.`}
      />

      <Panel className="mb-6">
        <div className="space-y-4 px-5 py-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Тип</h2>
            <div className="flex flex-wrap gap-2">
              <Chip href={hrefFor({ ...f, type: undefined })} active={!f.type} count={alerts.filter((a) => matches(a, { ...f, type: undefined })).length}>
                Все типы
              </Chip>
              {TYPES.map((t) => (
                <Chip key={t} href={hrefFor({ ...f, type: f.type === t ? undefined : t })} active={f.type === t} count={typeCount(t)}>
                  {TYPE_LABEL[t]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Уровень</h2>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((s) => (
                  <Chip key={s} href={hrefFor({ ...f, severity: f.severity === s ? undefined : s })} active={f.severity === s} count={sevCount(s)}>
                    <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLE[s].dot}`} aria-hidden="true" />
                    {SEVERITY_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </div>

            <form action="/alerts" method="get" className="flex flex-wrap items-end gap-2">
              {f.type && <input type="hidden" name="type" value={f.type} />}
              {f.severity && <input type="hidden" name="severity" value={f.severity} />}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Торговый представитель</span>
                <select
                  name="rep"
                  defaultValue={f.rep ?? ""}
                  className="h-9 rounded-md border border-line bg-carton px-2.5 text-sm text-ink"
                >
                  <option value="">Все сотрудники</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft">
                Показать
              </button>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
          <FoundSummary alerts={shown.map(slim)} />
          {active && (
            <Link href="/alerts" className="text-frost underline-offset-2 hover:underline">
              Сбросить
            </Link>
          )}
        </div>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          {shown.length > 0 ? (
            <AlertList className="space-y-4" items={shown.map((a) => ({ id: a.id, card: <AlertCard alert={a} data={dataset} /> }))} />
          ) : (
            <Panel>
              <div className="px-5 py-10 text-center text-sm text-muted">
                По выбранным фильтрам отклонений нет.{" "}
                <Link href="/alerts" className="text-frost underline-offset-2 hover:underline">
                  Показать все
                </Link>
              </div>
            </Panel>
          )}
        </div>

        <Panel title="Пороги срабатывания" className="lg:sticky lg:top-8">
          <dl className="divide-y divide-line text-sm">
            {THRESHOLDS.map(([k, v]) => (
              <div key={k} className="px-5 py-3">
                <dt className="font-medium">{k}</dt>
                <dd className="mt-0.5 text-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Пороги одинаковы для всех сотрудников и меняются в одном месте — в конфигурации системы.
          </p>
        </Panel>
      </div>
    </>
  );
}
