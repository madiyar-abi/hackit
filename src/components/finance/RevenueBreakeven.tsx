import type { Breakeven, RevenueBasis } from "./types";
import { fmtNum, fmtPayback, fmtTenge } from "./format";

const pct = (x: number, digits = 1) => `${x.toFixed(digits).replace(".", ",")}%`;

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-sm">
      <dt>
        {label}
        {note && <span className="block text-xs text-muted">{note}</span>}
      </dt>
      <dd className="whitespace-nowrap font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Revenue built bottom-up (sheet «Обоснование выручки»). */
export function RevenueBasisList({ r }: { r: RevenueBasis }) {
  return (
    <dl className="divide-y divide-line">
      <Row label="Торговых представителей" value={fmtNum(r.reps)} note="допущение команды" />
      <Row label="Торговых точек на одного ТП" value={fmtNum(r.outletsPerRep)} note="маршрут 20–25 точек в день, точка — раз в неделю" />
      <Row label="Активных торговых точек" value={fmtNum(r.outlets)} />
      <Row label="Средние продажи на точку в месяц" value={fmtTenge(r.salesPerOutletMonth)} note="допущение команды" />
      <Row label="Выручка канала ТП в месяц" value={fmtTenge(r.monthlyRevenue)} />
      <Row label="Выручка канала ТП в год" value={fmtTenge(r.annualRevenue)} />
      <Row label="Проверка: выручка на одного ТП в месяц" value={fmtTenge(r.revenuePerRepMonth)} />
      <Row label="Проверка: доля точек с ларём компании" value={pct(r.freezerOutletShare * 100, 0)} />
    </dl>
  );
}

/** Breakeven (sheet «Безубыточность»), base scenario. */
export function BreakevenList({ b }: { b: Breakeven }) {
  return (
    <dl className="divide-y divide-line">
      <Row
        label={`Нужный чистый годовой эффект, чтобы окупиться за ${b.horizonMonthsAfterLaunch} мес. после запуска`}
        value={fmtTenge(b.requiredNetAnnualEffect12m)}
        note={`при полном эффекте; выход на него — ${b.rampMonths} мес.`}
      />
      <Row
        label={`Минимальный прирост продаж для окупаемости за ${b.horizonMonthsAfterLaunch} мес. после запуска`}
        value={b.minUpliftPct12m > 0 ? pct(b.minUpliftPct12m, 2) : "0% — не нужен"}
        note={
          b.minUpliftPct12m > 0
            ? "эффект ларей и снижение списаний — как в базовом сценарии"
            : "лари и снижение списаний (базовый сценарий) окупают проект и без прироста продаж"
        }
      />
      <Row
        label="То же, если лари и списания не дадут ничего"
        value={pct(b.minUpliftPctNoOtherEffects, 2)}
      />
      <Row label="Чистый годовой эффект без эффекта ларей" value={fmtTenge(b.netAnnualEffectNoFreezers)} />
      <Row
        label="Окупаемость без эффекта ларей"
        value={b.paybackMonthsNoFreezers == null ? "не окупается" : fmtPayback(b.paybackMonthsNoFreezers)}
        note={b.paybackMonthFromStartNoFreezers == null ? undefined : `после запуска; ${b.paybackMonthFromStartNoFreezers}-й месяц от старта проекта`}
      />
    </dl>
  );
}
