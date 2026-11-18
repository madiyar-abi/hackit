import Link from "next/link";
import { notFound } from "next/navigation";
import { alerts, dataset } from "@/lib/app-data";
import { outletFreezer, outletSales, outletVisits, periodLabel, repOutlets, repPlan, repSales, repVisits } from "@/lib/selectors";
import { DEFAULT_CONFIG } from "@/lib/engine/config";
import { fmtMoney, fmtPct } from "@/lib/format";
import { PageHeader, Panel, TextLink } from "@/components/ui";
import { AlertCard } from "@/components/AlertCard";
import { SalesBars } from "@/components/SalesBars";

export function generateStaticParams() {
  return dataset.reps.map((r) => ({ id: r.id }));
}

const fulfilmentClass = (x: number) => (x <= 0.5 ? "text-critical" : x < 0.8 ? "text-high" : "text-ok");
const fmtDelta = (x: number) => {
  const r = Math.round(x * 100);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}%`;
};
const fmtDate = (s: string) => s.split("-").reverse().join(".");
const fmtKm = (m: number) => (m / 1000).toFixed(1).replace(".", ",");

export default async function RepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = dataset;
  const rep = d.reps.find((r) => r.id === id);
  if (!rep) notFound();

  const cur = d.currentPeriod;
  const prevP = d.previousPeriod;
  const supervisor = d.managers.find((m) => m.id === rep.supervisorId);
  const fact = repSales(d, rep.id, cur);
  const prev = repSales(d, rep.id, prevP);
  const plan = repPlan(d, rep.id, cur);
  const fulfilment = plan ? fact / plan : 0;
  const change = prev ? (fact - prev) / prev : 0;
  const visits = repVisits(d, rep.id, cur);
  const done = visits.filter((v) => v.status === "done").length;
  const missed = visits.length - done;
  const problemVisits = visits
    .filter((v) => v.status === "missed" || (v.distanceM ?? 0) > DEFAULT_CONFIG.gpsMaxDistanceM)
    .sort((a, b) => a.date.localeCompare(b.date) || a.plannedTime.localeCompare(b.plannedTime));
  const repAlerts = alerts.filter((a) => a.repId === rep.id);
  const outlets = repOutlets(d, rep.id);
  const outletName = (oid: string) => outlets.find((o) => o.id === oid)?.name ?? oid;

  return (
    <>
      <p className="mb-3 text-sm">
        <TextLink href="/reps">← Все сотрудники</TextLink>
      </p>
      <PageHeader title={rep.name} subtitle={`Торговый представитель, ${rep.district}. Данные за ${periodLabel(cur).toLowerCase()}.`} />

      <Panel className="mb-6">
        <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Район</dt>
            <dd className="mt-0.5">{rep.district}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Супервайзер</dt>
            <dd className="mt-0.5">{supervisor?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">В компании с</dt>
            <dd className="mt-0.5">{fmtDate(rep.hiredAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Телефон</dt>
            <dd className="mt-0.5">
              <a href={`tel:${rep.phone.replace(/[^\d+]/g, "")}`} className="text-frost underline-offset-2 hover:underline">
                {rep.phone}
              </a>
            </dd>
          </div>
        </dl>
      </Panel>

      <section aria-label="Ключевые показатели" className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-carton px-5 py-4">
          <div className="text-xs text-muted">Выполнение плана</div>
          <div className={`mt-1 font-display text-2xl font-semibold ${fulfilmentClass(fulfilment)}`}>{fmtPct(fulfilment)}</div>
          <div className="mt-1 text-xs text-muted">
            {fmtMoney(fact)} из {fmtMoney(plan)}
          </div>
        </div>
        <div className="bg-carton px-5 py-4">
          <div className="text-xs text-muted">Продажи к прошлому периоду</div>
          <div className={`mt-1 font-display text-2xl font-semibold ${change <= -DEFAULT_CONFIG.salesDropPct ? "text-critical" : ""}`}>
            {fmtDelta(change)}
          </div>
          <div className="mt-1 text-xs text-muted">
            {fmtMoney(prev)} → {fmtMoney(fact)}
          </div>
        </div>
        <div className="bg-carton px-5 py-4">
          <div className="text-xs text-muted">Визиты выполнено</div>
          <div className="mt-1 font-display text-2xl font-semibold">
            {done} <span className="text-base font-normal text-muted">из {visits.length}</span>
          </div>
          <div className="mt-1 text-xs text-muted">запланированных в периоде</div>
        </div>
        <div className="bg-carton px-5 py-4">
          <div className="text-xs text-muted">Пропущено визитов</div>
          <div className={`mt-1 font-display text-2xl font-semibold ${missed >= DEFAULT_CONFIG.missedVisitsMin ? "text-critical" : ""}`}>{missed}</div>
          <div className="mt-1 text-xs text-muted">порог отклонения: {DEFAULT_CONFIG.missedVisitsMin}</div>
        </div>
      </section>

      <Panel title="Продажи по периодам" className="mb-6">
        <div className="px-5 py-4">
          <SalesBars
            current={cur}
            data={d.periods.map((p) => ({ period: p, value: repSales(d, rep.id, p), plan: repPlan(d, rep.id, p) }))}
          />
        </div>
      </Panel>

      <section className="mb-6">
        <h2 className="mb-3 text-[0.95rem] font-semibold">Отклонения</h2>
        {repAlerts.length ? (
          <div className="space-y-4">
            {repAlerts.map((a) => (
              <AlertCard key={a.id} alert={a} data={d} />
            ))}
          </div>
        ) : (
          <Panel>
            <p className="px-5 py-4 text-sm text-muted">Отклонений нет.</p>
          </Panel>
        )}
      </section>

      <Panel title={`Точки (${outlets.length})`} className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Точка</th>
                <th className="px-3 py-3 font-medium">Тип</th>
                <th className="px-3 py-3 text-right font-medium">{periodLabel(cur)}</th>
                <th className="px-3 py-3 text-right font-medium">{periodLabel(prevP)}</th>
                <th className="px-3 py-3 font-medium">Ларь</th>
                <th className="px-3 py-3 text-right font-medium">Визиты</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Есть отклонение</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {outlets.map((o) => {
                const f = outletFreezer(d, o.id);
                const ov = outletVisits(d, o.id, cur);
                const ovDone = ov.filter((v) => v.status === "done").length;
                const hasAlert = alerts.some((a) => a.outletId === o.id);
                const s = outletSales(d, o.id, cur);
                return (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-milk/60">
                    <td className="px-5 py-2.5">
                      <Link href={`/outlets/${o.id}`} className="text-frost underline-offset-2 hover:underline">
                        {o.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{o.type}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right ${s === 0 ? "font-medium text-critical" : ""}`}>{fmtMoney(s)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted">{fmtMoney(outletSales(d, o.id, prevP))}</td>
                    <td className="px-3 py-2.5">
                      {!f ? (
                        <span className={o.freezerRequired ? "text-high" : "text-muted"}>нет</span>
                      ) : f.lastAudit?.found === false ? (
                        <span className="text-critical">не найден при проверке</span>
                      ) : (
                        "есть"
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${ovDone < ov.length ? "text-high" : ""}`}>
                      {ovDone} / {ov.length}
                    </td>
                    <td className="px-5 py-2.5">
                      {hasAlert && (
                        <span className="text-critical" title="Есть отклонение по точке">
                          <FlagIcon />
                          <span className="sr-only">Есть отклонение</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Проблемные визиты за текущий период">
        {problemVisits.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-3 py-3 font-medium">План</th>
                  <th className="px-3 py-3 font-medium">Точка</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {problemVisits.map((v) => (
                  <tr key={v.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">{fmtDate(v.date)}</td>
                    <td className="px-3 py-2.5">{v.plannedTime}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/outlets/${v.outletId}`} className="text-frost underline-offset-2 hover:underline">
                        {outletName(v.outletId)}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-critical">
                      {v.status === "missed" ? "Пропущен" : `Отметка в ${fmtKm(v.distanceM ?? 0)} км от точки`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">Все визиты выполнены, отметки в пределах {DEFAULT_CONFIG.gpsMaxDistanceM} м от точек.</p>
        )}
      </Panel>
    </>
  );
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="inline-block">
      <path d="M3 13V1.5m0 0h7.5L9 4.5l1.5 3H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
