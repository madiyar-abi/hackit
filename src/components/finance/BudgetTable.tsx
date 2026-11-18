import { fmtTenge } from "./format";
import type { BudgetData } from "./types";

const MONTHS = ["М1", "М2", "М3", "М4", "М5", "М6"];

export function BudgetTable({ budget }: { budget: BudgetData }) {
  const withinBudget = budget.total <= budget.limit;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-3 pl-4 pr-2 font-medium">Статья</th>
            <th className="px-2 py-3 font-medium text-center">Тип</th>
            {MONTHS.map((m) => (
              <th key={m} className="px-2 py-3 font-medium text-right whitespace-nowrap">{m}</th>
            ))}
            <th className="py-3 pl-2 pr-4 font-medium text-right">Итого</th>
          </tr>
        </thead>
        <tbody>
          {budget.items.map((item, i) => (
            <tr key={i} className="border-b border-line/50 hover:bg-milk/60 transition-colors">
              <td className="py-2.5 pl-4 pr-2 text-ink max-w-[260px]">{item.name}</td>
              <td className="px-2 py-2.5 text-center">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                  item.type === "CAPEX" ? "bg-frost-soft text-frost" : "bg-high-soft text-high"
                }`}>
                  {item.type}
                </span>
              </td>
              {item.byMonth.map((v, j) => (
                <td key={j} className="px-2 py-2.5 text-right tabular-nums text-ink-soft whitespace-nowrap">
                  {v === 0 ? <span className="text-muted/40">—</span> : fmtTenge(v)}
                </td>
              ))}
              <td className="py-2.5 pl-2 pr-4 text-right font-medium tabular-nums whitespace-nowrap">
                {fmtTenge(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-line font-semibold">
            <td className="py-3 pl-4 pr-2" colSpan={2}>Итого за 6 месяцев</td>
            {budget.byMonth.map((v, j) => (
              <td key={j} className="px-2 py-3 text-right tabular-nums whitespace-nowrap">{fmtTenge(v)}</td>
            ))}
            <td className="py-3 pl-2 pr-4 text-right tabular-nums whitespace-nowrap">{fmtTenge(budget.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-line/60 bg-milk/40 p-4 text-sm rounded-b-xl">
        <div>
          <span className="text-muted">Всего затрат:</span>{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtTenge(budget.total)}</span>
        </div>
        <div>
          <span className="text-muted">Лимит бюджета:</span>{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtTenge(budget.limit)}</span>
        </div>
        <div>
          <span className="text-muted">Запас лимита:</span>{" "}
          <span className="font-semibold tabular-nums text-ok">{fmtTenge(budget.limit - budget.total)}</span>
        </div>
        <div>
          <span className="text-muted">CAPEX:</span>{" "}
          <span className="font-medium tabular-nums">{fmtTenge(budget.capex)}</span>
        </div>
        <div>
          <span className="text-muted">OPEX:</span>{" "}
          <span className="font-medium tabular-nums">{fmtTenge(budget.opex)}</span>
        </div>
        <div className={`ml-auto font-semibold ${withinBudget ? "text-ok" : "text-critical"}`}>
          {withinBudget ? "✓ Укладывается в 30 млн ₸ и 6 месяцев" : "✗ Превышение бюджета"}
        </div>
      </div>
    </div>
  );
}
