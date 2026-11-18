import type { Metadata } from "next";
import summaryData from "../../../finance/summary.json";
import { PageHeader, Panel } from "@/components/ui";
import { BudgetTable } from "@/components/finance/BudgetTable";
import { ScenariosTable } from "@/components/finance/ScenariosTable";
import { AssumptionsList } from "@/components/finance/AssumptionsList";
import { fmtTenge, fmtRoi, fmtPayback } from "@/components/finance/format";
import type { FinanceSummary } from "@/components/finance/types";

const summary = summaryData as unknown as FinanceSummary;

export const metadata: Metadata = {
  title: "Финансовая модель — Пульс продаж",
  description: "Расчёт бюджета внедрения (CAPEX/OPEX), окупаемости и экономического эффекта системы.",
};

export default function FinancePage() {
  const { budget, scenarios, assumptions } = summary;
  const baseScenario = scenarios.find((s) => s.key === "base") || scenarios[1] || scenarios[0];
  const withinBudget = budget.total <= budget.limit;
  const budgetMargin = budget.limit - budget.total;

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Финансовая модель"
        subtitle="Оценка инвестиций, операционных затрат и окупаемости проекта внедрения системы контроля продаж молочного производства."
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok-soft px-3 py-1 text-xs font-medium text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Бюджет ≤ 30 млн ₸ (6 мес.)
          </span>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-line bg-carton p-4">
          <div className="text-xs text-muted">Бюджет проекта (6 мес.)</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-ink">{fmtTenge(budget.total)}</div>
          <div className="mt-1 text-xs text-ok font-medium">
            Лимит {fmtTenge(budget.limit)} (запас {fmtTenge(budgetMargin)})
          </div>
        </div>

        <div className="rounded-xl border border-line bg-carton p-4">
          <div className="text-xs text-muted">Годовой чистый эффект (базовый)</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-ink">{fmtTenge(baseScenario.netAnnualEffect)}</div>
          <div className="mt-1 text-xs text-muted">Прирост продаж + снижение потерь</div>
        </div>

        <div className="rounded-xl border border-line bg-carton p-4">
          <div className="text-xs text-muted">ROI 1-го года (базовый)</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-frost">{fmtRoi(baseScenario.roiYear1)}</div>
          <div className="mt-1 text-xs text-muted">С учётом возврата инвестиций</div>
        </div>

        <div className="rounded-xl border border-line bg-carton p-4">
          <div className="text-xs text-muted">Срок окупаемости (базовый)</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-ok">{fmtPayback(baseScenario.paybackMonths)}</div>
          <div className="mt-1 text-xs text-muted">С момента полного запуска</div>
        </div>
      </section>

      {/* Budget Panel */}
      <Panel
        title="План бюджета внедрения на 6 месяцев (CAPEX / OPEX)"
        action={
          <span className="text-xs text-muted">
            {withinBudget ? `Остаток лимита: ${fmtTenge(budgetMargin)}` : "Превышение"}
          </span>
        }
      >
        <div className="p-1">
          <BudgetTable budget={budget} />
        </div>
      </Panel>

      {/* Scenarios Panel */}
      <Panel
        title="Сценарии экономического эффекта (годовые показатели)"
        action={<span className="text-xs text-muted">3 сценария: пессимистичный, базовый, оптимистичный</span>}
      >
        <div className="p-1">
          <ScenariosTable scenarios={scenarios} />
        </div>
      </Panel>

      {/* Assumptions Panel */}
      <Panel
        title="Ключевые исходные допущения финансовой модели"
        action={<span className="text-xs text-muted">Источник: данные компании и отраслевые бенчмарки</span>}
      >
        <div className="p-1">
          <AssumptionsList assumptions={assumptions} />
        </div>
      </Panel>

      {/* Model info banner */}
      <div className="rounded-xl border border-line bg-carton p-5 text-sm text-ink-soft">
        <h3 className="font-semibold text-ink mb-1">Расчётная модель в Excel</h3>
        <p className="text-muted text-xs leading-relaxed">
          Финансовая модель полностью реализована в файле <code className="rounded bg-milk px-1.5 py-0.5 text-ink font-mono text-[11px]">finance/financial-model.xlsx</code> с живыми динамическими формулами Excel (SUM, ссылки на лист Допущения, расчёт ROI и окупаемости).
          Все цифры на данной странице синхронизированы с расчётной моделью через автоматический генератор данных.
        </p>
      </div>
    </div>
  );
}
