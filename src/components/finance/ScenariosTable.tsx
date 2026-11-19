import { fmtTenge, fmtRoi, fmtPayback } from "./format";
import type { Scenario } from "./types";

const SCENARIO_STYLE: Record<string, { header: string; badge: string }> = {
  pessimistic: { header: "bg-high-soft", badge: "text-high" },
  base: { header: "bg-frost-soft", badge: "text-frost" },
  optimistic: { header: "bg-ok-soft", badge: "text-ok" },
};

const ROWS: { label: string; key: keyof Scenario; fmt: (n: number) => string }[] = [
  { label: "Прирост выручки", key: "revenueUplift", fmt: fmtTenge },
  { label: "Доп. валовая прибыль", key: "grossProfitEffect", fmt: fmtTenge },
  { label: "Снижение списаний (по себестоимости)", key: "lossReduction", fmt: fmtTenge },
  { label: "Годовой OPEX поддержки", key: "annualOpex", fmt: fmtTenge },
  { label: "Чистый годовой эффект", key: "netAnnualEffect", fmt: fmtTenge },
  { label: "ROI за 12 мес. работы", key: "roiYear1", fmt: fmtRoi },
  { label: "Окупаемость после запуска", key: "paybackMonths", fmt: fmtPayback },
];

export function ScenariosTable({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="py-3 pl-4 pr-2 text-left text-xs text-muted font-medium">Показатель</th>
            {scenarios.map((s) => {
              const style = SCENARIO_STYLE[s.key] ?? { header: "bg-milk", badge: "text-ink" };
              return (
                <th key={s.key} className={`px-4 py-3 text-center font-semibold text-sm ${style.header} ${style.badge}`}>
                  {s.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key} className="border-t border-line/50 hover:bg-milk/60 transition-colors">
              <td className="py-2.5 pl-4 pr-2 text-ink-soft">{row.label}</td>
              {scenarios.map((s) => {
                const style = SCENARIO_STYLE[s.key];
                const isHighlight = row.key === "netAnnualEffect" || row.key === "roiYear1" || row.key === "paybackMonths";
                return (
                  <td
                    key={s.key}
                    className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${
                      isHighlight ? `font-semibold ${style?.badge ?? ""}` : ""
                    }`}
                  >
                    {row.fmt(s[row.key] as number)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
