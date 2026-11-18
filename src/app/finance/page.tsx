import type { Metadata } from "next";
import summaryData from "../../../finance/summary.json";
import { PageHeader, Panel } from "@/components/ui";
import { BudgetTable } from "@/components/finance/BudgetTable";
import { ScenariosTable } from "@/components/finance/ScenariosTable";
import { AssumptionsList } from "@/components/finance/AssumptionsList";
import { BreakevenList, RevenueBasisList } from "@/components/finance/RevenueBreakeven";
import { fmtTenge, fmtRoi, fmtPayback } from "@/components/finance/format";
import type { FinanceSummary } from "@/components/finance/types";

const summary = summaryData as unknown as FinanceSummary;

export const metadata: Metadata = {
  title: "Финансовая модель — Пульс продаж",
  description: "Расчёт бюджета внедрения (CAPEX/OPEX), окупаемости и экономического эффекта системы.",
};

export default function FinancePage() {
  const { budget, scenarios, assumptions, revenueBasis, breakeven } = summary;
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

      {(revenueBasis || breakeven) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {revenueBasis && (
            <Panel title="Откуда 6 млрд ₸: выручка снизу вверх" action={<span className="text-xs text-muted">лист «Обоснование выручки»</span>}>
              <RevenueBasisList r={revenueBasis} />
              <p className="border-t border-line px-5 py-3 text-xs text-muted">
                Все значения — допущения команды для среднего молочного завода РК, а не данные заказчика.
                На пилоте заменяются фактом из 1С — модель пересчитывается автоматически.
              </p>
            </Panel>
          )}
          {breakeven && (
            <Panel title="Безубыточность (базовый сценарий)" action={<span className="text-xs text-muted">лист «Безубыточность»</span>}>
              <BreakevenList b={breakeven} />
              <p className="border-t border-line px-5 py-3 text-xs text-muted">
                Вложения идут в месяцы 1–6, эффект — с 7-го месяца. Окупиться за 12 месяцев от старта значит
                вернуть бюджет за 6 месяцев работы системы.
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* Assumptions Panel */}
      <Panel
        title="Ключевые исходные допущения финансовой модели"
        action={<span className="text-xs text-muted">Допущения команды для среднего молочного завода РК</span>}
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
