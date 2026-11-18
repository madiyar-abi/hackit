import Link from "next/link";
import { alerts, dataset } from "@/lib/app-data";
import { periodLabel, repPlan, repSales, repVisits } from "@/lib/selectors";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { Severity } from "@/lib/types";
import { PageHeader, Panel, SeverityBadge } from "@/components/ui";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };

const fulfilmentClass = (x: number) => (x <= 0.5 ? "text-critical" : x < 0.8 ? "text-high" : "text-ok");
const fmtDelta = (x: number) => {
  const r = Math.round(x * 100);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}%`;
};

export default function RepsPage() {
  const d = dataset;
  const rows = d.reps
    .map((rep) => {
      const fact = repSales(d, rep.id, d.currentPeriod);
      const prev = repSales(d, rep.id, d.previousPeriod);
      const plan = repPlan(d, rep.id, d.currentPeriod);
      const visits = repVisits(d, rep.id, d.currentPeriod);
      const repAlerts = alerts.filter((a) => a.repId === rep.id);
      const worst = repAlerts.map((a) => a.severity).sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])[0];
      return {
        rep,
        supervisor: d.managers.find((m) => m.id === rep.supervisorId)?.name ?? "—",
        fact,
        plan,
        fulfilment: plan ? fact / plan : 0,
        change: prev ? (fact - prev) / prev : 0,
        done: visits.filter((v) => v.status === "done").length,
        planned: visits.length,
        alertCount: repAlerts.length,
        worst,
      };
    })
    .sort((a, b) => a.fulfilment - b.fulfilment);

  return (
    <>
      <PageHeader
        title="Сотрудники"
        subtitle={`Торговые представители, ${periodLabel(d.currentPeriod).toLowerCase()}. Сверху — самое низкое выполнение плана.`}
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">ТП</th>
                <th className="px-3 py-3 font-medium">Район</th>
                <th className="px-3 py-3 font-medium">Супервайзер</th>
                <th className="px-3 py-3 text-right font-medium">План</th>
                <th className="px-3 py-3 text-right font-medium">Факт</th>
                <th className="px-3 py-3 text-right font-medium">Выполнение</th>
                <th className="px-3 py-3 text-right font-medium">К прошлому периоду</th>
                <th className="px-3 py-3 text-right font-medium">Визиты</th>
                <th className="px-5 py-3 font-medium">Отклонения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rep.id} className="border-b border-line last:border-0 hover:bg-milk/60">
                  <td className="whitespace-nowrap px-5 py-3">
                    <Link href={`/reps/${r.rep.id}`} className="font-medium text-frost underline-offset-2 hover:underline">
                      {r.rep.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{r.rep.district}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">{r.supervisor}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{fmtMoney(r.plan)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{fmtMoney(r.fact)}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${fulfilmentClass(r.fulfilment)}`}>{fmtPct(r.fulfilment)}</td>
                  <td className={`px-3 py-3 text-right ${r.change <= -0.3 ? "font-medium text-critical" : ""}`}>{fmtDelta(r.change)}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right ${r.done < r.planned ? "" : "text-muted"}`}>
                    {r.done} / {r.planned}
                  </td>
                  <td className="px-5 py-3">
                    {r.worst ? (
                      <span className="inline-flex items-center gap-2">
                        <SeverityBadge severity={r.worst} />
                        <span className="text-muted">{r.alertCount}</span>
                      </span>
                    ) : (
                      <span className="text-muted">нет</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
