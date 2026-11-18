# TASKS — night/2026-11-19

Format: `- [ ] T<n> (owner) <task> — files: <paths> — accept: <check>`.
Owners: `lead`, `gemini`, `codex`. Workers: only your tagged tasks, only your files.
Product name: **«Пульс продаж»** (веб-приложение контроля торговой команды молочного завода).
Stack: Next.js 15 (App Router, TypeScript, Tailwind), vitest; finance model — Python + openpyxl.

## Core app (lead)
- [x] T1 (lead) Scaffold Next.js app + vitest + README run steps — files: package.json, tsconfig.json, next.config.*, src/app/layout.tsx, src/app/globals.css, vitest.config.ts, README.md — accept: `npm install && npm run build && npm test` pass
- [x] T2 (lead) Domain types + deterministic demo data (12 reps, 120+ outlets, sales plan/fact by period, planned/actual visits with GPS/time, freezers) containing all 5 case situations — files: src/lib/types.ts, src/lib/data/* — accept: vitest asserts each of the 5 situations exists in data
- [x] T3 (lead) Deviation engine: 5 detectors (missed visits, sales drop ≥30%, outlet without freezer, freezer without sales, plan ≤50%), thresholds in config — files: src/lib/engine/config.ts, src/lib/engine/detect.ts, src/lib/engine/*.test.ts — accept: `npm test` green, one test per type
- [x] T4 (lead) Possible causes + recommended actions (rules correlating related data, with evidence) — files: src/lib/engine/causes.ts (+test) — accept: every alert in demo data has ≥1 cause with evidence and an action
- [x] T5 (lead) Notifications: severity, feed, simulated Telegram/e-mail message text — files: src/lib/engine/notify.ts (+test) — accept: test checks message text for each type
- [x] T6 (lead) Manager dashboard `/` (KPIs, alerts by severity, 5 case situations visible) — files: src/app/page.tsx, src/components/* — accept: build passes, page shows alerts of all 5 types
- [x] T7 (lead) Alerts list `/alerts` with filters (type, severity, rep) — files: src/app/alerts/* — accept: build passes, filters work via query params
- [x] T8 (lead) Rep card `/reps/[id]` and outlet card `/outlets/[id]` — files: src/app/reps/*, src/app/outlets/* — accept: build passes, pages statically generated
- [x] T9 (lead) Notifications feed `/notifications` with simulated send (Telegram / e-mail preview) — files: src/app/notifications/* — accept: build passes
- [x] T13 (lead) Deploy to Vercel; link in README.md and HANDOFF.md — accept: link opens dashboard

## Workers
- [x] T10 (codex) Financial model generator — files: finance/build_model.py, finance/financial-model.xlsx, finance/summary.json, finance/verify.py, finance/README.md — accept: `python3 finance/build_model.py && python3 finance/verify.py` exit 0 (see "Notes for T10" below)
- [x] T11 (gemini) `docs/DOCUMENTATION.md` skeleton: all 16 Hack.IT template sections as `## ` headings in exactly this order — Название; Направление и кейс; Команда; Аннотация; Обзор решения; Используемые инструменты и технологии; Исходные данные и расчёты; Как работает решение; Прототип или демо; Бюджет и сроки; Результаты и оценка эффекта; Риски и ограничения; Как посмотреть или запустить проект; Примеры, схемы и фрагменты; Заключение; Источники. Fill in Russian only what does not depend on code: Название («Пульс продаж»), Направление и кейс (case text from night/SPEC.md), Команда (`[Название команды]`, `[Участник 1..4]` + roles placeholders), Риски и ограничения (8–10 realistic risks of rolling out such a system at a dairy producer, each with mitigation), Источники (case PDFs in docs/case/). Other sections: one line `_Заполняется по коду и финмодели (lead)._` — files: docs/DOCUMENTATION.md only — accept: `grep -c '^## ' docs/DOCUMENTATION.md` prints 16 and the order matches
- [x] T12 (gemini) Finance page `/finance` in the web app — START ONLY WHEN both `package.json` and `finance/summary.json` exist after `git merge origin/night/2026-11-19`. Server component importing `finance/summary.json` (schema below): budget table (items × 6 months + totals, CAPEX/OPEX), total vs 30 млн ₸ limit, scenarios table (пессимистичный/базовый/оптимистичный: эффект, ROI, окупаемость), key assumptions list; Russian, numbers formatted `12 345 678 ₸`. Add link «Финмодель» to nav only if `src/components/Nav.tsx` exists (one line). — files: src/app/finance/page.tsx, src/components/finance/* (+ one line in src/components/Nav.tsx) — accept: `npm run build` passes and `/finance` is in the build output
- [x] T18 (codex) Finance model v2: add sheet `Денежный поток` (24 months, base scenario: months 1–6 = −budget by month from `Бюджет`; from month 7 = +netAnnualEffect/12 of the base scenario from `Сценарии`; cumulative cash flow; payback month = first month with cumulative ≥ 0; NPV at a monthly rate from a new input «Ставка дисконтирования, % годовых» = 16 on `Допущения`) and sheet `Чувствительность` (base net annual effect and payback for uplift % = 1, 2, 3, 4, 5 and idle-freezer reactivation % = 30, 50, 70 — a formula grid). All formulas live. Extend `finance/summary.json` with a NEW key only (don't change existing keys): `"cashflow": {"discountRatePct": 16, "months": [1..24], "net": [...], "cumulative": [...], "paybackMonth": n, "npv": x}`. Extend verify.py to check these against the evaluated workbook. — files: finance/* only — accept: `finance/.venv/bin/python finance/build_model.py && finance/.venv/bin/python finance/verify.py` exit 0
- [x] T19 (gemini) Smoke test script `scripts/smoke.sh`: runs `npm run build`, starts `npx next start -p 3100` in background, waits until it answers, curls `/`, `/alerts`, `/alerts?type=sales_drop`, `/reps`, `/reps/r05`, `/outlets/o023`, `/notifications`, `/finance` and asserts HTTP 200 and that `/` contains «Ситуации из кейса» and `/alerts?type=sales_drop` contains «Тимур Жумабеков»; kills the server on exit (trap); exits non-zero on any failure. macOS bash 3.2 compatible. — files: scripts/smoke.sh only — accept: `bash scripts/smoke.sh` exit 0 on the merged night branch (after T12 is merged; skip `/finance` check if the route doesn't exist yet)
- [x] T20 (codex) Threshold playground page `/settings` («Пороги»): client component that imports `generateDataset` from `src/lib/data/generate.ts` and `analyze` + `DEFAULT_CONFIG` from `src/lib/engine` (pure functions, run in the browser), shows inputs (number/range) for missedVisitsMin, salesDropPct (as %), planFulfilmentMax (as %), gpsMaxDistanceM, gpsMismatchMin, freezerUpliftPct (as %), re-runs `analyze(dataset, config)` on change (useMemo) and shows: total alerts, count per type (use TYPE_LABEL from src/lib/engine/notify.ts), total impact (fmtMoney from src/lib/format.ts), and the list of alert titles with SeverityBadge (src/components/ui.tsx). Button «Сбросить к значениям по умолчанию». Russian UI, match the existing style (PageHeader, Panel from src/components/ui.tsx; Tailwind tokens from src/app/globals.css). Do NOT edit Nav.tsx (lead adds the link). — files: src/app/settings/page.tsx, src/app/settings/ThresholdPlayground.tsx — accept: `npx tsc --noEmit && npm run build` pass and `/settings` is in the build output; `npm test` still green

## Jury materials & final (lead)
- [x] T14 (lead) Fill `docs/DOCUMENTATION.md` with facts from code and finance model — accept: all 16 sections filled, numbers equal finance/summary.json
- [x] T15 (lead) `docs/DEMO.md` — demo-video script 2–3 min: numbered steps, exact clicks/URLs/inputs, what to say, which result to show — accept: every step reproducible on the deployed app
- [x] T16 (lead) `docs/PITCH.md` — 5-min slide outline: problem → solution → live demo → how it works (architecture, stack) → results/metrics → what's next → team; ≤4 bullets per slide, facts only from code/finmodel; + prepared answers to likely jury questions (budget, rollout, risks) — accept: numbers match finance/summary.json
- [ ] T17 (lead) Final check vs SPEC.md acceptance list, README/HANDOFF "How to run", create night/DONE

---

## Notes for T10 (codex) — financial model

Write `finance/build_model.py` (Python 3, openpyxl only) that creates `finance/financial-model.xlsx`
with **live Excel formulas** (cells contain `=SUM(...)`, `=...*...` — not precomputed numbers,
except inputs on the assumptions sheet), Russian sheet names and labels, currency ₸, number
format `# ##0`. It also computes the same values in Python and writes `finance/summary.json`.

Sheets:
1. `Допущения` — every input in one place, one row each: name, value, unit, comment.
   Scenario-dependent inputs have 3 value columns (Пессимистичный / Базовый / Оптимистичный).
2. `Бюджет` — implementation budget: rows = items below, columns = Месяц 1..6 + Итого + Тип (CAPEX/OPEX);
   totals row with SUM; check cells: `Итого ≤ 30 000 000` → "OK", срок 6 мес → "OK".
3. `Эффект` — annual effect per scenario (formulas referencing `Допущения`).
4. `Сценарии` — side-by-side table of 3 scenarios: годовой прирост выручки, доп. валовая прибыль,
   снижение потерь, годовой OPEX поддержки, чистый годовой эффект, ROI 1-го года, окупаемость (мес.).
5. `Сводка` — key numbers referencing other sheets.

Budget items (₸, months 1..6; put these numbers as inputs in `Допущения` or directly as the
row inputs in `Бюджет`, totals must be formulas):
| Статья | Тип | М1 | М2 | М3 | М4 | М5 | М6 |
|---|---|---|---|---|---|---|---|
| Аналитика и проектирование (бизнес-аналитик, архитектор) | CAPEX | 1 200 000 | 600 000 | 0 | 0 | 0 | 0 |
| Разработка веб-панели и движка отклонений (2 разработчика) | CAPEX | 0 | 2 400 000 | 2 400 000 | 2 400 000 | 1 200 000 | 0 |
| Мобильное приложение ТП (GPS-отметки визитов, фото ларя) | CAPEX | 0 | 1 500 000 | 1 500 000 | 1 000 000 | 0 | 0 |
| Интеграция с 1С (продажи, план, отгрузки) | CAPEX | 0 | 0 | 1 500 000 | 1 500 000 | 0 | 0 |
| QR/NFC-метки на морозильные лари (1 000 шт.) | CAPEX | 0 | 0 | 0 | 600 000 | 0 | 0 |
| Облачная инфраструктура (хостинг в РК) | OPEX | 150 000 | 150 000 | 250 000 | 250 000 | 250 000 | 250 000 |
| Уведомления (Telegram-бот, SMS, e-mail), карты | OPEX | 0 | 0 | 100 000 | 100 000 | 200 000 | 200 000 |
| Пилот в 1 регионе + сопровождение | OPEX | 0 | 0 | 0 | 0 | 1 500 000 | 0 |
| Обучение ТП и супервайзеров, тиражирование | OPEX | 0 | 0 | 0 | 0 | 500 000 | 1 500 000 |
| Тестирование и поддержка (QA/DevOps) | OPEX | 0 | 300 000 | 300 000 | 300 000 | 300 000 | 300 000 |
| Резерв на непредвиденные расходы (10% от суммы статей выше) | OPEX | formula | formula | formula | formula | formula | formula |

Effect assumptions (scenario columns Пессим. / Базовый / Оптим.):
- Выручка канала торговых представителей, ₸/год: 6 000 000 000 (all scenarios)
- Валовая маржа: 25%
- Прирост продаж от контроля визитов и плана, %: 1.5 / 3.0 / 5.0
- Морозильных ларей компании: 1 000; доля ларей без продаж: 15%
- Доля «пустых» ларей, возвращённых в продажи (перестановка/поставки): 30% / 50% / 70%
- Продажи на один активный ларь, ₸/мес: 120 000
- Списания/возвраты, % выручки: 2.0%; снижение списаний, п.п.: 0.2 / 0.4 / 0.6
- Поддержка системы после внедрения (OPEX), ₸/мес: 700 000
Formulas (per scenario):
- revenue_uplift = revenue × uplift%  +  freezers × idle_share × reactivated_share × sales_per_freezer × 12
- gross_profit_effect = revenue_uplift × margin
- loss_reduction = revenue × reduction_pp/100
- annual_opex = support_per_month × 12
- net_annual_effect = gross_profit_effect + loss_reduction − annual_opex
- investment = Бюджет total
- roi_year1 = (net_annual_effect − investment) / investment
- payback_months = investment / (net_annual_effect / 12)

`finance/summary.json` schema (gemini's `/finance` page depends on it — keep exact keys):
```json
{
  "currency": "₸",
  "budget": {
    "limit": 30000000, "months": 6, "total": 0, "capex": 0, "opex": 0,
    "byMonth": [0,0,0,0,0,0],
    "items": [{"name": "…", "type": "CAPEX", "byMonth": [0,0,0,0,0,0], "total": 0}]
  },
  "scenarios": [{
    "key": "pessimistic", "name": "Пессимистичный",
    "revenueUplift": 0, "grossProfitEffect": 0, "lossReduction": 0,
    "annualOpex": 0, "netAnnualEffect": 0, "roiYear1": 0.0, "paybackMonths": 0.0
  }],
  "assumptions": [{"name": "…", "unit": "…", "values": [0,0,0]}]
}
```
(scenarios in order pessimistic, base, optimistic; `roiYear1` as a fraction, e.g. 1.25 = 125%;
amounts rounded to whole ₸.)

`finance/verify.py`: (a) opens the xlsx with openpyxl and asserts formula cells exist on
`Бюджет`/`Эффект`/`Сценарии` (values starting with `=`); (b) evaluates the workbook formulas
independently — use `pycel` or `formulas` installed in a git-ignored venv `finance/.venv`
(document the command in finance/README.md); if the package can't be installed, re-implement
the evaluation of the totals by reading input cells — and asserts the evaluated budget total,
each scenario's net effect and payback equal `summary.json` (±1 ₸); (c) asserts total ≤ 30 000 000
and months == 6. Add the line `finance/.venv/` to `.gitignore` (the only file outside
finance/ you may touch). Expected ballpark (base): budget total ≈ 27.17 млн ₸, net annual
effect ≈ 87.6 млн ₸, payback ≈ 3.7 мес.
