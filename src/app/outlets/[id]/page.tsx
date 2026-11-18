import { notFound } from "next/navigation";
import { alerts, dataset } from "@/lib/app-data";
import { outletFreezer, outletSales, outletVisits, periodLabel } from "@/lib/selectors";
import { DEFAULT_CONFIG } from "@/lib/engine/config";
import { fmtNum } from "@/lib/format";
import { PageHeader, Panel, TextLink } from "@/components/ui";
import { AlertCard } from "@/components/AlertCard";
import { SalesBars } from "@/components/SalesBars";
import { VisitMap } from "@/components/VisitMap";

export function generateStaticParams() {
  return dataset.outlets.map((o) => ({ id: o.id }));
}

const fmtDate = (s: string) => s.split("-").reverse().join(".");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export default async function OutletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = dataset;
  const outlet = d.outlets.find((o) => o.id === id);
  if (!outlet) notFound();

  const rep = d.reps.find((r) => r.id === outlet.repId);
  const freezer = outletFreezer(d, outlet.id);
  const audit = freezer?.lastAudit;
  const outletAlerts = alerts.filter((a) => a.outletId === outlet.id);
  const shownPeriods = [d.currentPeriod, d.previousPeriod];
  const visits = outletVisits(d, outlet.id)
    .filter((v) => shownPeriods.includes(v.period))
    .sort((a, b) => b.date.localeCompare(a.date));
  const maxM = DEFAULT_CONFIG.gpsMaxDistanceM;

  return (
    <>
      {rep && (
        <p className="mb-3 text-sm">
          <TextLink href={`/reps/${rep.id}`}>← {rep.name}</TextLink>
        </p>
      )}
      <PageHeader title={outlet.name} subtitle={`${outlet.type[0].toUpperCase()}${outlet.type.slice(1)}, ${outlet.address}`} />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Panel title="Точка">
          <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
            <Field label="Тип">{outlet.type}</Field>
            <Field label="Район">{outlet.district}</Field>
            <Field label="Адрес">{outlet.address}</Field>
            <Field label="ТП">{rep ? <TextLink href={`/reps/${rep.id}`}>{rep.name}</TextLink> : "—"}</Field>
            <Field label="Координаты">
              {outlet.lat.toFixed(5)}, {outlet.lng.toFixed(5)}
            </Field>
          </dl>
        </Panel>

        <Panel title="Ларь компании">
          {freezer ? (
            <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
              <Field label="Модель">{freezer.model}</Field>
              <Field label="Инвентарный номер">{freezer.id}</Field>
              <Field label="Установлен">{fmtDate(freezer.installedAt)}</Field>
              {audit ? (
                <>
                  <Field label="Последняя проверка">{fmtDate(audit.date)}</Field>
                  <Field label="Ларь на месте">
                    {audit.found ? "да" : <span className="font-medium text-critical">нет, не найден</span>}
                  </Field>
                  <Field label="Доля нашей продукции">
                    <span className={audit.ourProductSharePct < 50 ? "text-high" : ""}>{audit.ourProductSharePct}%</span>
                  </Field>
                  <Field label="Продукция конкурента">
                    {audit.competitorProduct ? <span className="text-high">есть</span> : "нет"}
                  </Field>
                  {audit.note && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted">Комментарий проверяющего</dt>
                      <dd className="mt-0.5">{audit.note}</dd>
                    </div>
                  )}
                </>
              ) : (
                <Field label="Последняя проверка">не проводилась</Field>
              )}
            </dl>
          ) : (
            <div className="px-5 py-4 text-sm">
              <p className="font-medium">Ларь компании не установлен</p>
              {outlet.freezerRequired && <p className="mt-1 text-high">По стандарту для этого типа точки ларь требуется.</p>}
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <Panel title="Продажи по периодам">
          <div className="px-5 py-4">
            <SalesBars current={d.currentPeriod} data={d.periods.map((p) => ({ period: p, value: outletSales(d, outlet.id, p) }))} />
          </div>
        </Panel>
        <Panel title="Отметки визитов">
          <div className="px-5 py-4">
            <VisitMap
              lat={outlet.lat}
              lng={outlet.lng}
              radiusM={maxM}
              points={visits.flatMap((v) => (v.gps ? [{ id: v.id, ...v.gps, label: `${fmtDate(v.date)} ${v.checkInTime ?? ""}` }] : []))}
            />
            <p className="mt-3 text-xs text-muted">
              Квадрат — точка, круг — допустимые {maxM} м. Отметки дальше показаны красным; дальше 600 м — на краю схемы с расстоянием.
            </p>
          </div>
        </Panel>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-[0.95rem] font-semibold">Отклонения по точке</h2>
        {outletAlerts.length ? (
          <div className="space-y-4">
            {outletAlerts.map((a) => (
              <AlertCard key={a.id} alert={a} data={d} />
            ))}
          </div>
        ) : (
          <Panel>
            <p className="px-5 py-4 text-sm text-muted">Отклонений нет.</p>
          </Panel>
        )}
      </section>

      <Panel title={`Визиты: ${periodLabel(d.previousPeriod).toLowerCase()} — ${periodLabel(d.currentPeriod).toLowerCase()}`}>
        {visits.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-3 py-3 font-medium">План</th>
                  <th className="px-3 py-3 font-medium">Отметка</th>
                  <th className="px-3 py-3 font-medium">Статус</th>
                  <th className="px-3 py-3 text-right font-medium">От точки, м</th>
                  <th className="px-5 py-3 font-medium">Примечание</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => {
                  const far = (v.distanceM ?? 0) > maxM;
                  return (
                    <tr key={v.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2.5">{fmtDate(v.date)}</td>
                      <td className="px-3 py-2.5">{v.plannedTime}</td>
                      <td className="px-3 py-2.5">{v.checkInTime ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {v.status === "missed" ? <span className="text-critical">Пропущен</span> : "Выполнен"}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${far ? "font-medium text-critical" : ""}`}>
                        {v.distanceM !== undefined ? fmtNum(v.distanceM) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-muted">{v.note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">Визитов не было.</p>
        )}
      </Panel>
    </>
  );
}
