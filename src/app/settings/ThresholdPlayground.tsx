"use client";

import { useMemo, useState } from "react";
import { Panel, SeverityBadge } from "@/components/ui";
import { generateDataset } from "@/lib/data/generate";
import { analyze, DEFAULT_CONFIG, type EngineConfig } from "@/lib/engine";
import { TYPE_LABEL } from "@/lib/engine/notify";
import { fmtMoney } from "@/lib/format";
import type { DeviationType } from "@/lib/types";

interface Threshold {
  key: keyof EngineConfig;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const thresholds: Threshold[] = [
  { key: "missedVisitsMin", label: "Минимум пропущенных визитов", unit: "", min: 1, max: 50, step: 1 },
  { key: "salesDropPct", label: "Минимальное падение продаж", unit: "%", min: 0, max: 100, step: 1 },
  { key: "planFulfilmentMax", label: "Максимальное выполнение плана", unit: "%", min: 0, max: 100, step: 1 },
  { key: "gpsMaxDistanceM", label: "Допустимое расстояние от точки по GPS", unit: "м", min: 0, max: 3000, step: 10 },
  { key: "gpsMismatchMin", label: "Минимум отметок вне точки", unit: "", min: 1, max: 50, step: 1 },
  { key: "freezerUpliftPct", label: "Ожидаемый прирост продаж от ларя", unit: "%", min: 0, max: 100, step: 1 },
];

const types = Object.keys(TYPE_LABEL) as DeviationType[];

export function ThresholdPlayground() {
  const [dataset] = useState(generateDataset);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const { alerts, byType, impact } = useMemo(() => {
    const alerts = analyze(dataset, config);
    const byType = new Map<DeviationType, number>();
    let impact = 0;
    for (const alert of alerts) {
      byType.set(alert.type, (byType.get(alert.type) ?? 0) + 1);
      impact += alert.impact;
    }
    return { alerts, byType, impact };
  }, [dataset, config]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Panel title="Настройки расчёта">
        <div className="space-y-4 p-5">
          {thresholds.map(({ key, label, unit, min, max, step }) => {
            const scale = unit === "%" ? 100 : 1;
            const value = Math.round(config[key] * scale);
            return (
              <div key={key}>
                <label htmlFor={key} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium">
                  {label}
                  <span aria-hidden="true" className="whitespace-nowrap text-frost">
                    {value}{unit && ` ${unit}`}
                  </span>
                </label>
                <input
                  id={key}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  aria-valuetext={unit ? `${value} ${unit}` : undefined}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.valueAsNumber / scale;
                    setConfig((current) => ({ ...current, [key]: nextValue }));
                  }}
                  className="h-11 w-full cursor-pointer accent-frost"
                />
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="min-h-11 cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-medium text-frost transition-colors hover:bg-frost-soft"
          >
            Сбросить к значениям по умолчанию
          </button>
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Результат">
          <dl aria-live="polite" className="grid gap-4 border-b border-line bg-milk px-5 py-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Всего отклонений</dt>
              <dd className="mt-1 text-2xl font-semibold">{alerts.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Сумма под риском за месяц</dt>
              <dd className="mt-1 text-2xl font-semibold">{fmtMoney(impact)}</dd>
            </div>
          </dl>
          <dl className="divide-y divide-line px-5">
            {types.map((type) => (
              <div key={type} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-ink-soft">{TYPE_LABEL[type]}</dt>
                <dd className="font-semibold">{byType.get(type) ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Список отклонений">
          {alerts.length ? (
            <ul className="divide-y divide-line px-5">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm">
                  <span>{alert.title}</span>
                  <SeverityBadge severity={alert.severity} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">При этих порогах отклонений нет.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
