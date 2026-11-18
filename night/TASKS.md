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
- [x] T17 (lead) Final check vs SPEC.md acceptance list, README/HANDOFF "How to run", create night/DONE

## Phase 2 (night/SPEC.md «Фаза 2»; started 2026-11-19 01:30)
Order = priority. Phase 1 must keep working (tests, smoke, deploy, README).
- [x] T21 (codex) Finance model realism — files: finance/build_model.py, finance/verify.py, finance/README.md, finance/financial-model.xlsx, finance/summary.json — accept: `finance/.venv/bin/python finance/build_model.py && finance/.venv/bin/python finance/verify.py` exit 0 (see "Notes for T21" below)
- [x] T22 (lead) KPI «Продажи под угрозой» without double counting: pure function in engine (+test), dashboard/notify use it, note explains what is summed — files: src/lib/engine/*, src/app/page.tsx — accept: `npm test` green; per-rep overlapping losses counted once
- [x] T23 (lead) «Отметить обработанным» / «Вернуть» on alerts (localStorage in try/catch, pure fn + test), handled alerts visually separated, dashboard counters count them on the client — files: src/lib/handled.ts(+test), src/components/*, src/app/page.tsx, src/app/alerts/* — accept: `npm test` green, build passes, state survives reload
- [x] T24 (gemini) Mobile rep app prototype `/mobile` (see "Notes for T24") — files: src/app/mobile/*, one line in src/components/Nav.tsx, one check line in scripts/smoke.sh — accept: `npx tsc --noEmit && npx eslint src && npm run build` pass, `/mobile` in build output, `bash scripts/smoke.sh` exit 0
- [x] T25 (lead) Comparison with existing SFA/merchandising class + jury answers «чем вы лучше готовых систем?», «откуда 6 млрд выручки?» — files: docs/DOCUMENTATION.md, docs/PITCH.md — accept: sections present, only verifiable claims, no product names
- [x] T26 (lead) Merge T21: `/finance` shows revenue basis + breakeven from summary.json; all numbers in /finance, DOCUMENTATION.md, PITCH.md, README, HANDOFF match summary.json — files: src/app/finance/*, src/components/finance/*, docs/* — accept: build passes; grep of old numbers (87 600 000, 222,4, 3,7 мес) finds nothing stale
- [x] T27 (lead) docs/DEMO.md: alert-handling step (+ /mobile step if T24 done) — accept: steps reproducible on deploy
- [ ] T28 (lead) Final phase 2: `npm test`, `bash scripts/smoke.sh`, `vercel deploy --prod` (project puls-prodazh), verify prod shows new version, README/HANDOFF/PITCH/DEMO current, phase 2 acceptance re-checked, `night/DONE` — accept: all SPEC phase-2 criteria checked

## Notes for T21 (codex) — finance model realism
Do NOT rename existing sheets/keys; Excel formulas must stay live; keep openpyxl only for building.
1. New sheet `Обоснование выручки` (insert right after `Допущения`). Columns: A Показатель, B Значение, C Единица, D Комментарий (откуда взято). Rows (B = input in blue font unless formula):
   - 2 Число торговых представителей = 25 — «Допущение команды: типичная полевая команда среднего молочного завода РК; уточняется данными заказчика»
   - 3 Торговых точек на одного ТП = 100 — «Допущение: маршрут 20–25 точек в день, каждая точка — раз в неделю (5 рабочих дней)»
   - 4 Активных торговых точек = `=B2*B3`
   - 5 Средние продажи на точку в месяц, ₸ = 200 000 — «Допущение: средняя закупка молочной продукции точкой (киоск … супермаркет)»
   - 6 Выручка канала ТП в месяц = `=B4*B5`
   - 7 Выручка канала ТП в год = `=B6*12`
   - 8 Выручка на одного ТП в месяц (проверка) = `=B6/B2`
   - 9 Доля точек с ларём компании (проверка) = `='Допущения'!B5/B4` (percent format)
   - 11 (text in A) «Все значения — допущения команды для среднего молочного завода РК, а не данные заказчика. На пилоте заменяются фактом из 1С.»
   Then `Допущения`!B2 becomes the formula `='Обоснование выручки'!B7` (comment column: «Снизу вверх: лист „Обоснование выручки“»). Total must stay 6 000 000 000.
2. Write-offs from cost, not revenue: `Эффект` row 6 «Снижение потерь за год (по себестоимости)» = revenue × reduction_pp/100 × (1 − margin/100). Same in `write_summary`. Comment on the Допущения row «Снижение списаний и возвратов»: «Списанная продукция оценивается по себестоимости = выручка × (1 − валовая маржа)».
   Expected base: lossReduction 18 000 000, netAnnualEffect 81 600 000, payback ≈ 4.0 мес., ROI ≈ 200,3%.
3. New sheet `Безубыточность` (base scenario, column B formulas, column C comment):
   - 2 Инвестиции = `='Бюджет'!H13`
   - 3 Месяцев эффекта до конца 12-го месяца от старта = `=12-'Допущения'!B14`
   - 4 Требуемый чистый годовой эффект для окупаемости за 12 мес. = `=B2/B3*12`
   - 5 Валовая прибыль от ларей (базовый) = `='Эффект'!C3*'Допущения'!B3/100`
   - 6 Снижение потерь (базовый) = `='Эффект'!C6`
   - 7 OPEX поддержки за год = `='Эффект'!C7`
   - 8 Мин. прирост продаж для окупаемости за 12 мес., % (лари и списания — как в базовом) = `=(B4+B7-B5-B6)/('Допущения'!B2*'Допущения'!B3/100)*100` (≈ 1.18)
   - 9 Мин. прирост продаж, % (без эффекта ларей и списаний) = `=(B4+B7)/('Допущения'!B2*'Допущения'!B3/100)*100` (≈ 4.18)
   - 10 Чистый годовой эффект без ларей (базовый) = `='Эффект'!C2*'Допущения'!B3/100+B6-B7` (≈ 54 600 000)
   - 11 Окупаемость без эффекта ларей, мес. после запуска = `=IF(B10>0,B2/(B10/12),"Не окупается")` (≈ 5.97)
   - 12 Месяц окупаемости от старта без ларей = `=IF(B10>0,'Допущения'!B14+ROUNDUP(B11,0),"Не окупается")` (= 12)
4. `summary.json`: keep all existing keys; add
   `"revenueBasis": {"reps":25,"outletsPerRep":100,"outlets":2500,"salesPerOutletMonth":200000,"monthlyRevenue":500000000,"annualRevenue":6000000000,"revenuePerRepMonth":20000000,"freezerOutletShare":0.4}` and
   `"breakeven": {"requiredNetAnnualEffect12m":…, "minUpliftPct12m":…, "minUpliftPctNoOtherEffects":…, "netAnnualEffectNoFreezers":…, "paybackMonthsNoFreezers":…, "paybackMonthFromStartNoFreezers":…}` (money rounded to whole ₸, pct/months as floats).
5. `verify.py`: assert formula cells on the two new sheets, `Допущения`!B2 is a formula, and every new summary key equals the evaluated workbook (money ±1 ₸, floats ±1e-9); existing checks still pass. Update `finance/README.md` (sheets list, write-off logic).

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


## Notes for T24 (gemini) — `/mobile` prototype
- `src/app/mobile/page.tsx` (server component): `PageHeader` title «Мобильное приложение ТП», subtitle «Прототип экрана, данные демо». Picks rep `r01` (or the first rep that has ≥ 5 visits on one date in `dataset.currentPeriod`; take that date) and passes plain data (rep, that day's visits sorted by `plannedTime`, their outlets, freezers of those outlets) to a client component.
- `src/app/mobile/MobileApp.tsx` ("use client"): centred phone frame (~390×780 px, rounded-[2.5rem], dark border, inner scroll). Inside, three tabs at the bottom: «Маршрут», «Визит», «Заказ».
  - Маршрут: list of the day's outlets (time, name, address, status badge: выполнен / пропущен / предстоит). Tap → selects outlet and opens «Визит».
  - Визит: outlet name; button «Отметиться» simulates GPS: use the visit's `gps` if present else outlet coords + small offset; compute distance with `distanceM` from `src/lib/geo.ts`; show «В точке: N м» green if ≤ `DEFAULT_CONFIG.gpsMaxDistanceM` (from `src/lib/engine/config.ts`), otherwise red «Слишком далеко от точки: N м — отметка уйдёт супервайзеру». Block «Ларь компании»: button «Сканировать QR ларя» → shows freezer id + model if the outlet has a freezer, else «Ларь не найден — будет создано отклонение». Button «Сделать фото» → shows a placeholder thumbnail «Фото ларя (демо)».
  - Заказ: 5–6 hard-coded dairy SKUs (Молоко 3,2% 1 л, Кефир 2,5% 1 л, Сметана 20% 400 г, Творог 9% 200 г, Йогурт питьевой 270 г, Мороженое пломбир 80 г) with prices in ₸, +/− quantity buttons, total via `fmtMoney` (`src/lib/format.ts`), button «Отправить заказ» → confirmation text «Заказ отправлен (демо)».
  - All state in React `useState`; no new dependencies; Russian UI; reuse Tailwind tokens from `src/app/globals.css` (ink, frost, milk, line, carton, ok, critical, muted).
- Nav: add one line `{ href: "/mobile", label: "Приложение ТП" },` to LINKS in `src/components/Nav.tsx` (last item).
- smoke: add `check_endpoint "/mobile" "Прототип экрана"` to `scripts/smoke.sh`.
