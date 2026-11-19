import Link from "next/link";
import { alerts, dataset, notifications, outcomes, outcomesTotal } from "@/lib/app-data";
import { repPlan, repSales, periodLabel, totalPlan, totalSales } from "@/lib/selectors";
import { fmtMoney, fmtPct, plural } from "@/lib/format";
import type { DeviationType } from "@/lib/types";
import { AlertCard } from "@/components/AlertCard";
import { PageHeader, Panel, SEVERITY_STYLE } from "@/components/ui";
import { AlertList, OpenCounts, OpenRisk } from "@/components/Handled";
import { slim } from "@/lib/handled";

const CASE_SITUATIONS: { type: DeviationType; text: string }[] = [
  { type: "missed_visits", text: "Торговый представитель не посетил 5 запланированных точек" },
  { type: "sales_drop", text: "Продажи сотрудника упали на 30% к прошлому периоду" },
  { type: "no_freezer", text: "В торговой точке отсутствует морозильный ларь компании" },
  { type: "freezer_no_sales", text: "Морозильник установлен, но продаж нет" },
  { type: "plan_underperformance", text: "Сотрудник выполняет только 50% плана" },
];

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Almaty",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function Dashboard() {
  const d = dataset;
  const p = d.currentPeriod;
  const fact = totalSales(d, p);
  const plan = totalPlan(d, p);
  const prev = totalSales(d, d.previousPeriod);
  const visits = d.visits.filter((v) => v.period === p);
  const done = visits.filter((v) => v.status === "done").length;
  const slimAlerts = alerts.map(slim);

  const team = d.reps
    .map((r) => ({ r, ratio: repSales(d, r.id, p) / repPlan(d, r.id, p) }))
    .sort((a, b) => a.ratio - b.ratio);

  return (
    <>
      <PageHeader
        title={`Обзор за ${periodLabel(p).toLowerCase()}`}
        subtitle={`${d.company}. Ночная проверка выполнена 01.11.2026 в 07:00 — найдено ${alerts.length} отклонений, руководство уведомлено.`}
      >
        <Link
          href="/alerts"
          className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-soft"
        >
          Все отклонения
        </Link>
      </PageHeader>

      <Panel className="mb-6">
        <dl className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x [&>div]:px-5 [&>div]:py-4">
          <Kpi label="Выполнение плана" value={fmtPct(fact / plan)} note={`${fmtMoney(fact)} из ${fmtMoney(plan)}`} />
          <Kpi
            label="К прошлому месяцу"
            value={`${fact >= prev ? "+" : "−"}${fmtPct(Math.abs(fact - prev) / prev)}`}
            note={`${periodLabel(d.previousPeriod)}: ${fmtMoney(prev)}`}
          />
          <Kpi label="Визиты выполнены" value={fmtPct(done / visits.length)} note={`${done} из ${visits.length} плановых`} />
          <div>
            <dt className="text-sm text-muted">Продажи под угрозой</dt>
            <OpenRisk alerts={slimAlerts} />
          </div>
        </dl>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="attention">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="attention" className="text-lg font-semibold">Требуют внимания</h2>
            <OpenCounts alerts={slimAlerts} />
          </div>
          <AlertList items={alerts.map((a) => ({ id: a.id, card: <AlertCard alert={a} data={d} compact /> }))} />
        </section>

        <aside className="space-y-6">
          <Panel title={`Результат действий: ${periodLabel(d.previousPeriod).toLowerCase()} → ${periodLabel(p).toLowerCase()}`}>
            <div className="border-b border-line bg-milk px-5 py-3 text-sm">
              <p>
                Из {plural(outcomesTotal.total, ["отклонения", "отклонений", "отклонений"])} прошлого месяца устранено{" "}
                <span className="font-semibold text-ok">{outcomesTotal.resolved}</span>, повторяются{" "}
                <span className="font-semibold text-critical">{outcomesTotal.persisting}</span>.
              </p>
              {outcomesTotal.recoveredSales > 0 && (
                <p className="mt-0.5 text-muted">
                  Продажи по устранённым выросли на <span className="font-semibold text-ink">{fmtMoney(outcomesTotal.recoveredSales)}</span> в месяц.
                </p>
              )}
            </div>
            <ul className="divide-y divide-line">
              {outcomes.map((o) => (
                <li key={o.previous.id} className="px-5 py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{o.previous.title}</span>
                    <span className={`shrink-0 text-xs font-medium ${o.status === "resolved" ? "text-ok" : "text-critical"}`}>
                      {o.status === "resolved" ? "устранено" : "повторяется"}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {o.status === "resolved"
                      ? `продажи ${o.salesDelta >= 0 ? "+" : "−"}${fmtMoney(Math.abs(o.salesDelta))} к прошлому месяцу`
                      : "эскалировано на уровень выше"}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Ситуации из кейса">
            <ul className="divide-y divide-line">
              {CASE_SITUATIONS.map((s, i) => {
                const found = alerts.filter((a) => a.type === s.type);
                return (
                  <li key={s.type} className="flex gap-3 px-5 py-3 text-sm">
                    <span className="mt-0.5 font-display text-xs font-semibold text-muted">{i + 1}</span>
                    <div>
                      <p>{s.text}</p>
                      {found.length ? (
                        <Link href={`/alerts?type=${s.type}`} className="mt-0.5 inline-block text-ok hover:underline">
                          Найдено автоматически: {found.length}
                        </Link>
                      ) : (
                        <span className="text-muted">Не обнаружено</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Выполнение плана по ТП" action={<Link href="/reps" className="text-sm text-frost hover:underline">Все</Link>}>
            <ul className="space-y-2 px-5 py-4">
              {team.map(({ r, ratio }) => {
                const color = ratio <= 0.5 ? "bg-critical" : ratio < 0.8 ? "bg-high" : "bg-ok";
                return (
                  <li key={r.id}>
                    <Link href={`/reps/${r.id}`} className="group block">
                      <div className="flex justify-between text-sm">
                        <span className="group-hover:text-frost group-hover:underline">{r.name}</span>
                        <span className="font-medium">{fmtPct(ratio)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-milk">
                        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Последние уведомления"
            action={<Link href="/notifications" className="text-sm text-frost hover:underline">Лента</Link>}
          >
            <ul className="divide-y divide-line">
              {[...notifications].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 4).map((n) => (
                <li key={n.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {n.channel === "telegram" ? "Telegram" : "E-mail"}: {n.recipientName}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_STYLE[n.severity].dot}`} aria-hidden="true" />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-muted">{n.subject}</p>
                  <p className="mt-0.5 text-xs text-muted">{timeFmt.format(new Date(n.sentAt))}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 whitespace-nowrap font-display text-xl font-semibold tracking-tight sm:text-2xl `}>
        {value}
      </dd>
      <dd className="mt-0.5 text-xs text-muted">{note}</dd>
    </div>
  );
}
