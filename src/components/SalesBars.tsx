import { fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { periodLabel } from "@/lib/selectors";

export interface SalesBar {
  period: string;
  value: number;
  plan?: number;
}

const H = 190;
const TOP = 24;
const BASE = 158;

const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} млн` : v >= 1_000 ? `${Math.round(v / 1_000)} тыс` : fmtNum(v);

/** Fact per period as bars; optional plan as a dashed tick over each bar. Current period is drawn in full colour. */
export function SalesBars({ data, current }: { data: SalesBar[]; current?: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.plan ?? 0)));
  const y = (v: number) => BASE - (v / max) * (BASE - TOP);
  const n = data.length;
  const pct = (x: number) => `${(x / n) * 100}%`;
  const hasPlan = data.some((d) => d.plan);
  const summary = data.map((d) => `${periodLabel(d.period)}: ${fmtMoney(d.value)}`).join("; ");

  return (
    <div>
      <svg width="100%" height={H} role="img" aria-label={`Продажи по периодам. ${summary}`} className="block overflow-visible">
        <line x1="0" x2="100%" y1={BASE} y2={BASE} className="stroke-line" strokeWidth="1" />
        {data.map((d, i) => {
          const top = y(d.value);
          const h = BASE - top;
          // Value sits on the bar; lift it over the plan tick only when the tick is right above the bar.
          const planY = d.plan ? y(d.plan) : BASE;
          const labelY = (planY < top && top - planY < 18 ? planY : top) - 7;
          const isCurrent = d.period === current;
          const tip =
            `${periodLabel(d.period)}: факт ${fmtMoney(d.value)}` +
            (d.plan ? `, план ${fmtMoney(d.plan)} (${fmtPct(d.value / d.plan)})` : "");
          return (
            <g key={d.period}>
              <title>{tip}</title>
              <rect x={pct(i)} width={pct(1)} y="0" height={H} fill="transparent" />
              {h > 0 && (
                <g className="fill-frost" opacity={current && !isCurrent ? 0.45 : 1}>
                  <rect x={pct(i + 0.28)} width={pct(0.44)} y={top} height={h} rx="4" />
                  <rect x={pct(i + 0.28)} width={pct(0.44)} y={BASE - Math.min(4, h)} height={Math.min(4, h)} />
                </g>
              )}
              {d.plan ? (
                <line
                  x1={pct(i + 0.18)}
                  x2={pct(i + 0.82)}
                  y1={y(d.plan)}
                  y2={y(d.plan)}
                  className="stroke-ink"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              ) : null}
              <text x={pct(i + 0.5)} y={labelY} textAnchor="middle" className="fill-ink text-[11px] font-medium">
                {compact(d.value)}
              </text>
              <text x={pct(i + 0.5)} y={BASE + 20} textAnchor="middle" className={`text-xs ${isCurrent ? "fill-ink font-medium" : "fill-muted"}`}>
                {periodLabel(d.period).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      {hasPlan && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-frost" aria-hidden="true" />
            Факт, ₸
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="4" aria-hidden="true">
              <line x1="0" x2="16" y1="2" y2="2" className="stroke-ink" strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            План
          </span>
        </div>
      )}
    </div>
  );
}
