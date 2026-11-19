import type { Assumption } from "./types";

const SCENARIO_NAMES = ["Пессим.", "Базовый", "Оптим."];

function fmtVal(v: number, unit: string): string {
  if (unit === "₸/год" || unit === "₸" || unit === "₸/мес.") {
    return Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + unit;
  }
  if (unit === "%" || unit === "п.п.") {
    return v % 1 === 0 ? `${v} ${unit}` : `${v.toFixed(1).replace(".", ",")} ${unit}`;
  }
  if (unit === "шт." || unit === "мес.") {
    return `${v} ${unit}`;
  }
  return `${v} ${unit}`;
}

export function AssumptionsList({ assumptions }: { assumptions: Assumption[] }) {
  const allSame = (vals: number[]) => vals.every((v) => v === vals[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-3 pl-4 pr-2 font-medium">Допущение</th>
            <th className="px-2 py-3 font-medium text-right">Значение</th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map((a, i) => {
            const same = allSame(a.values);
            return (
              <tr key={i} className="border-b border-line/50 hover:bg-milk/60 transition-colors">
                <td className="py-2 pl-4 pr-2 text-ink">{a.name}</td>
                <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-ink-soft">
                  {same ? (
                    fmtVal(a.values[0], a.unit)
                  ) : (
                    <span className="inline-flex flex-wrap gap-x-3 justify-end">
                      {a.values.map((v, j) => (
                        <span key={j} className="text-xs">
                          <span className="text-muted">{SCENARIO_NAMES[j]}:</span>{" "}
                          <span className="font-medium">{fmtVal(v, a.unit)}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
