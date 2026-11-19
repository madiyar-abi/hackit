"use client";

import { useMemo, useState } from "react";
import { Panel, SeverityBadge, TypeTag } from "@/components/ui";
import { generateDataset } from "@/lib/data/generate";
import { analyze, riskSummary, TYPE_LABEL } from "@/lib/engine";
import { fmtMoney, plural } from "@/lib/format";
import { buildDataset, FILE_SPECS, matchFiles, toCsvFiles, type ImportResult } from "@/lib/import/dataset";
import { generateExampleDataset } from "@/lib/import/example";
import { periodLabel } from "@/lib/selectors";
import type { DeviationType } from "@/lib/types";

interface Loaded extends ImportResult {
  source: string;
  ignored: string[];
}

const types = Object.keys(TYPE_LABEL) as DeviationType[];

function download(name: string, text: string) {
  // BOM so that Excel opens UTF-8 Cyrillic correctly
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportAnalyzer() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const example = useMemo(() => toCsvFiles(generateExampleDataset()), []);

  const alerts = useMemo(() => (loaded?.dataset ? analyze(loaded.dataset) : []), [loaded]);
  const risk = useMemo(() => riskSummary(alerts), [alerts]);

  const loadExample = () => {
    // The example goes through the same CSV → import path as an uploaded file.
    const company = generateExampleDataset().company;
    setLoaded({ ...buildDataset(example, company), source: "Пример: другой регион", ignored: [] });
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = await Promise.all([...list].map(async (f) => ({ name: f.name, text: await f.text() })));
    const matched = matchFiles(files);
    const ignored = files.map((f) => f.name).filter((n) => !Object.values(matchFiles([{ name: n, text: "" }])).length);
    setLoaded({ ...buildDataset(matched), source: `Загружено файлов: ${files.length}`, ignored });
  };

  const d = loaded?.dataset;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <div className="grid gap-5">
        <Panel title="1. Данные">
          <div className="space-y-4 p-5 text-sm">
            <button
              type="button"
              onClick={loadExample}
              className="min-h-11 w-full cursor-pointer rounded-lg bg-frost px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
            >
              Проверить на примере: другой регион (Караганда)
            </button>
            <p className="text-muted">
              Пример — отдельный набор данных: другой город, 6 сотрудников, 48 точек, 3 месяца и свои проблемы.
              Он загружается через тот же разбор CSV, что и ваши файлы.
            </p>
            <label className="block">
              <span className="font-medium">Или загрузите свои CSV-файлы</span>
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => onFiles(e.currentTarget.files)}
                className="mt-2 block w-full cursor-pointer rounded-lg border border-line bg-milk p-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-frost-soft file:px-3 file:py-1.5 file:text-frost"
              />
            </label>
            <div>
              <div className="font-medium">Шаблоны (CSV примера)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILE_SPECS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => download(s.name, example[s.name])}
                    className="min-h-9 cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs text-frost hover:bg-frost-soft"
                  >
                    {s.name}.csv
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const demo = toCsvFiles(generateDataset());
                    FILE_SPECS.forEach((s, i) => setTimeout(() => download(`demo_${s.name}`, demo[s.name]), i * 250));
                  }}
                  className="min-h-9 cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:bg-milk"
                >
                  демо-данные (Алматы), все файлы
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Формат файлов">
          <ul className="divide-y divide-line px-5 text-sm">
            {FILE_SPECS.map((s) => (
              <li key={s.name} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <code className="font-mono text-[13px] font-semibold">{s.name}.csv</code>
                  <span className={`text-xs ${s.required ? "text-critical" : "text-muted"}`}>
                    {s.required ? "обязательный" : "по возможности"}
                  </span>
                </div>
                <div className="text-muted">{s.label}</div>
                <div className="mt-1 break-words font-mono text-[11px] text-ink-soft">
                  {s.columns.map((c) => (s.requiredColumns.includes(c) ? `${c}*` : c)).join("; ")}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            * — обязательная колонка. Разделитель «;» или «,», даты 2026-10-01 или 01.10.2026, период 2026-10 или 10.2026.
            Нужны данные минимум за 2 месяца: последний месяц сравнивается с предыдущим. Без визитов, ларей или планов
            соответствующие проверки просто не срабатывают.
          </p>
        </Panel>
      </div>

      <div className="grid gap-5" aria-live="polite">
        {!loaded && (
          <Panel title="2. Результат">
            <p className="px-5 py-6 text-sm text-muted">
              Нажмите «Проверить на примере» или загрузите свои файлы — здесь появятся найденные отклонения с причинами.
            </p>
          </Panel>
        )}

        {loaded && (
          <Panel title="2. Результат" action={<span className="text-xs text-muted">{loaded.source}</span>}>
            {loaded.errors.length > 0 && (
              <div className="border-b border-line bg-critical-soft px-5 py-3 text-sm text-critical">
                <div className="font-medium">Не удалось разобрать данные</div>
                <ul className="mt-1 list-disc pl-5">
                  {loaded.errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}
            {loaded.ignored.length > 0 && (
              <p className="border-b border-line px-5 py-2.5 text-xs text-muted">
                Не распознаны по имени и пропущены: {loaded.ignored.join(", ")}. Имя файла должно оканчиваться на одно из: {FILE_SPECS.map((s) => s.name).join(", ")}.
              </p>
            )}
            {d && (
              <>
                <div className="border-b border-line px-5 py-3 text-sm">
                  <div className="font-medium">{d.company}</div>
                  <div className="text-muted">
                    Период: {periodLabel(d.currentPeriod).toLowerCase()} (сравнение: {periodLabel(d.previousPeriod).toLowerCase()}) ·{" "}
                    {plural(d.reps.length, ["сотрудник", "сотрудника", "сотрудников"])} ·{" "}
                    {plural(d.outlets.length, ["точка", "точки", "точек"])} ·{" "}
                    {plural(d.freezers.length, ["ларь", "ларя", "ларей"])} · {plural(d.visits.length, ["визит", "визита", "визитов"])}
                  </div>
                </div>
                <dl className="grid gap-4 border-b border-line bg-milk px-5 py-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted">Найдено отклонений</dt>
                    <dd className="mt-1 text-2xl font-semibold">{alerts.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Продажи под угрозой за месяц</dt>
                    <dd className="mt-1 text-2xl font-semibold">{fmtMoney(risk.lostSales)}</dd>
                  </div>
                </dl>
                <dl className="grid gap-x-6 border-b border-line px-5 py-2 sm:grid-cols-2">
                  {types.map((t) => (
                    <div key={t} className="flex justify-between gap-3 py-1.5 text-sm">
                      <dt className="text-ink-soft">{TYPE_LABEL[t]}</dt>
                      <dd className="font-semibold">{alerts.filter((a) => a.type === t).length}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {loaded.warnings.length > 0 && (
              <details className="border-b border-line px-5 py-2.5 text-xs text-muted">
                <summary className="cursor-pointer">Предупреждения: {loaded.warnings.length}</summary>
                <ul className="mt-1 list-disc pl-5">
                  {loaded.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </details>
            )}
          </Panel>
        )}

        {d && (
          <Panel title="Отклонения, причины и действия">
            {alerts.length ? (
              <ul className="divide-y divide-line">
                {alerts.map((a) => (
                  <li key={a.id} className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <TypeTag type={a.type} />
                      {a.impact > 0 && <span className="text-xs text-muted">под угрозой {fmtMoney(a.impact)}/мес</span>}
                    </div>
                    <div className="mt-1.5 font-medium">{a.title}</div>
                    <div className="text-muted">{a.description}</div>
                    <ul className="mt-2 space-y-1">
                      {a.causes.slice(0, 2).map((c) => (
                        <li key={c.title}>
                          <span className="font-medium">Причина:</span> {c.title}
                          {c.evidence[0] && <span className="text-muted"> — {c.evidence[0]}</span>}
                        </li>
                      ))}
                    </ul>
                    {a.actions[0] && (
                      <div className="mt-1.5 text-ok">
                        <span className="font-medium">Действие:</span> {a.actions[0]}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">Отклонений не найдено — по этим данным всё в норме.</p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
