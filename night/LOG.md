# LOG — night/2026-11-19 (append-only)

## 2026-11-19 00:25 lead
- Read SPEC/NIGHT/HANDOFF. Wrote night/TASKS.md (T1–T17). Workers: codex → T10 finance model;
  gemini → T11 docs skeleton, then T12 /finance page (after T1 + T10 land on the night branch).
- Assumptions: product name «Пульс продаж»; Next.js 15 + Tailwind + vitest; demo data generated
  deterministically in TypeScript (seeded PRNG) at build time; budget line items and effect
  assumptions defined by lead in TASKS.md "Notes for T10" (total ≈ 27.17 млн ₸ ≤ 30 млн).
- No LibreOffice on this Mac → formula evaluation for verification via pycel/formulas in a venv.
- Next: T1 scaffold, T2 data, T3–T5 engine.

## 2026-11-19 00:28 lead
- T1 done: Next.js 15.5 (App Router, TS, Tailwind 4) + vitest 3 scaffolded at repo root.
  Removed next/font/google (needs internet at build) → system font stack. build + test pass.
- Assumption: package name `puls-prodazh`; .gitignore kept ours + Next/Vercel entries + finance/.venv/.

## 2026-11-19 00:31 codex
- T10 complete. Generated the five-sheet Excel workbook and the exact JSON contract for T12.
  Ran `python3 finance/build_model.py && python3 finance/verify.py`. Independent formula
  evaluation passed for the budget and all three scenarios.
- Assumptions: monthly implementation costs are editable on «Бюджет» as allowed in T10.
  Reserve remains OPEX. ROI uses 12 months of operations after deployment. Payback starts
  when benefits begin. Excel recalculates on open. The virtualenv ignore rule was already present.
- Budget 27 170 000 ₸ over six months. Base annual net effect 87 600 000 ₸,
  first-year ROI 222.4%, payback 3.72 months.
- Next: lead merges the worker branch so T12 can use finance/summary.json.

## 2026-11-19 00:31 gemini
- T11 done: docs/DOCUMENTATION.md created with all 16 Hack.IT template sections in correct order.
  Filled: Название («Пульс продаж»), Направление и кейс (verbatim case text from SPEC.md),
  Команда (placeholder names [Участник 1..4] with role descriptions),
  Риски и ограничения (10 realistic risks with mitigations: staff resistance, GPS accuracy,
  internet coverage, 1C integration, budget overrun, scaling, cloud vendor lock-in,
  false alerts, personal data privacy, tight timeline),
  Источники (3 case PDFs in docs/case/).
  Remaining sections marked as lead-owned placeholders.
- Next: T12 (finance page) — waiting for finance/summary.json from codex (T10).

## 2026-11-19 00:34 lead
- T2–T5 done: src/lib/types.ts, src/lib/data/generate.ts (seeded, 12 reps / 120 outlets / 4 months,
  SCENARIO map plants the 5 case situations + GPS bonus), src/lib/engine/{config,detect,causes,notify,index}.ts.
  31 vitest tests green (data situations, each detector, config thresholds, causes, notification text).
- Engine output on demo data: 8 alerts (3 critical, 3 high, 2 medium), at risk ≈ 7.2 млн ₸/мес.
- Assumptions: case 3 covered twice (freezer never installed / registered but missing on audit);
  case 4 twice (competitor product in freezer / outlet closed); 6th bonus type "GPS-отметка вне точки".
  Severity routing: critical → РОП (Telegram+e-mail) + супервайзер; high → супервайзер Telegram;
  medium → супервайзер e-mail. Company/people in demo data are fictional.
- Next: UI screens T6–T9 (subagents), merge workers.

## 2026-11-19 00:43 codex
- T18 complete. Added 24-month cash flow and two sensitivity grids covering 15 combinations.
  The only JSON addition is cashflow. Existing fields and values compare equal to T10.
- Assumptions: the 16% annual discount rate is effective and flows occur at each month end.
  Sensitivity payback is measured from the start of benefits. Cash-flow payback is the first
  whole project month with nonnegative cumulative flow. Base payback is month 10 and
  24-month NPV is 82 688 162 ₸, rounded to whole tenge in JSON.
- Passed `finance/.venv/bin/python finance/build_model.py && finance/.venv/bin/python finance/verify.py`.
  Next: lead merges the worker branch.

## 2026-11-19 00:44 lead
- Merged codex T10 (finance model verified with formulas lib: OK) and gemini T11.
- T6–T9 done via 2 subagents + lead (dashboard). Reviewed via Playwright screenshots; dates in alert
  texts now dd.mm.yyyy. Build: 140 static pages, /alerts dynamic (query filters).
- T13: deployed to Vercel, project puls-prodazh → https://puls-prodazh-nine.vercel.app (all routes 200).
- T14/T16 drafts written (DOCUMENTATION.md all 16 sections; PITCH.md + Q&A). Added T18 (codex),
  T19 (gemini). README + HANDOFF updated.
- Assumption: Onest/Unbounded fonts bundled via @fontsource (offline build).
- Next: T15 DEMO.md, merge T12/T18/T19, final pass T17.

## 2026-11-19 00:47 gemini
- T12 done: created /finance server component page and components (BudgetTable, ScenariosTable, AssumptionsList, types, format).
  Displays implementation budget (items × 6 months + totals, CAPEX/OPEX, limit check ≤ 30M ₸, remaining limit),
  scenarios table (pessimistic, base, optimistic with revenue uplift, gross profit, loss reduction, OPEX, net effect, ROI, payback),
  and key model assumptions. All amounts formatted as '12 345 678 ₸'. Added 'Финмодель' link to Nav.tsx.
  Verified with npm run build (141 static pages, /finance generated) and vitest.
- Next: T19 (scripts/smoke.sh).

## 2026-11-19 00:49 gemini
- T19 done: created scripts/smoke.sh (executable, macOS Bash 3.2 compatible).
  Runs `npm run build`, starts Next.js server on port 3100 in background, polls until ready,
  curls /, /alerts, /alerts?type=sales_drop, /reps, /reps/r05, /outlets/o023, /notifications, /finance.
  Asserts HTTP 200, checks «Ситуации из кейса» on /, and «Тимур Жумабеков» on /alerts?type=sales_drop.
  Traps EXIT/INT/TERM to cleanly stop the server. Verified by executing `bash scripts/smoke.sh` (exit 0).
- All gemini tasks (T11, T12, T19) complete.

## 2026-11-19 00:51 codex
- T20 complete. /settings runs the engine in the browser against the deterministic demo
  dataset. It shows live alert totals, counts per type, summed impact, and severity badges.
- Assumptions: settings are local to the page. Native sliders cover 1–50 visits or off-site
  check-ins, 0–100 percent, and 0–3000 metres in 10-metre steps.
- Passed TypeScript, production build (/settings is static), and all 31 tests. Chrome smoke
  checked keyboard slider updates, impact, reset, and no overflow in mobile orientations.
- Next: lead merges T20 and adds the navigation link.

## 2026-11-19 00:57 lead
- Applied code review (14 findings): plural forms, NBSP in money, km with comma, guards for zero
  thresholds, freezer-without-sales impact = outlet's own 3-month average (risk now 7 002 665 ₸/мес),
  latest notifications sorted by time, rep chart starts at hire month, payback wording in docs
  («3,7 мес. после запуска, 10-й месяц от старта»). Not changed (documented as Q&A soft spots):
  plan-gap impact of the new rep, loss reduction computed on revenue.
- Merged gemini T12 (/finance) + T19 (smoke.sh) and codex T18 (finance v2) + T20 (/settings); added
  «Пороги» nav link. 34 tests, smoke test, finance verify all pass. Redeployed to Vercel.
- Screenshots docs/screenshots/ (from production) embedded in DOCUMENTATION.md.
- Tried to store cached values in the xlsx via Excel AppleScript — Excel hung (likely a first-run /
  automation permission dialog); left formulas-only file (fullCalcOnLoad=1). Humans: open & save.
- T17: SPEC acceptance list re-checked line by line; fresh clone install/build/test OK. Creating night/DONE.

## 2026-11-19 01:27 lead
- Phase 2 spec arrived (night/SPEC.md «Фаза 2»). Wrote T21–T28 into night/TASKS.md.
  codex: T21 finance realism (finance/* only). gemini: T24 /mobile prototype (src/app/mobile/*,
  one Nav line, one smoke line). lead: T22 risk KPI, T23 handled alerts, T25 competitors, T26 numbers
  sync, T27 DEMO, T28 final deploy + DONE.
- Assumptions: revenue basis 25 ТП × 100 точек × 200 000 ₸/мес × 12 = 6 млрд ₸ (team estimate,
  labelled as such); write-off reduction valued at cost = revenue × (1 − margin); breakeven = cumulative
  cash ≥ 0 by month 12 from project start (6 months of effect).

## 2026-11-19 01:31 lead
- T22: riskSummary() in src/lib/engine/risk.ts (+5 tests). «Продажи под угрозой» = lost sales, per rep
  max(largest rep-level loss, sum of outlet-level freezer losses); plan gap shown separately (it is a
  target shortfall, not a loss). Demo: 3 646 665 ₸/мес lost sales + 2 894 000 ₸ plan gap (was 7 002 665
  summed). Used in dashboard, /alerts summary, daily digest, /settings.
- T23: «Отметить обработанным» / «Вернуть» on every AlertCard; localStorage key puls.handledAlerts.v1 via
  useSyncExternalStore (try/catch, server snapshot = none handled); handled cards in a dimmed
  «Обработанные · N» section; dashboard severity counters and risk KPI computed on open alerts.
  Pure logic src/lib/handled.ts (+4 tests). Playwright: click → reload → persists; «Вернуть» restores.
- T25 (subagent, reviewed): SFA-class comparison table in DOCUMENTATION «Обзор решения», PITCH slide 3
  bullet + 2 jury answers. Breakeven numbers to fill in T26 after codex T21.
- 43 tests, smoke OK. Next: wait for codex T21 / gemini T24, then T26.

## 2026-11-19 01:32 codex
- T21 complete. Added «Обоснование выручки» and «Безубыточность» with live formulas.
  Revenue still totals 6 млрд ₸ and now derives from 25 reps, 100 outlets per rep and
  200 000 ₸ monthly sales per outlet. These are team assumptions to validate with 1С in the pilot.
- Write-off savings now use cost of goods. Base savings 18 млн ₸, net annual effect 81.6 млн ₸,
  first-year ROI 200.3%, payback 4.00 months after launch, project month 10, NPV 75 242 934 ₸.
  Break-even requires 1.18% sales uplift with the other base effects or 4.18% without them.
  With base write-off savings and no freezer effect, payback lands in project month 12.
- Passed `finance/.venv/bin/python finance/build_model.py && finance/.venv/bin/python finance/verify.py`.
  Summary retains the original keys and adds revenueBasis and breakeven. Next: lead merges T21
  and refreshes jury-facing numbers from summary.json.

## 2026-11-19 01:34 lead
- Merged codex T21 (reviewed build_model.py diff; verify.py exit 0; numbers as specified: base net
  81 600 000 ₸, ROI 200,3%, payback 4,0 мес., NPV 75 242 934 ₸, breakeven 1,18% / 4,18%).
- T26: /finance gets panels «Откуда 6 млрд ₸» and «Безубыточность» from summary.json (optional keys),
  write-off row renamed «по себестоимости», removed the unsupported label «данные компании и
  отраслевые бенчмарки» → «допущения команды». DOCUMENTATION/PITCH/DEMO/HANDOFF numbers synced;
  grep for old numbers (87,6 / 222 / 3,7 / 7,7 / 82,7 / 7 002 665) is clean. Build OK, screenshot checked.

## 2026-11-19 01:43 gemini
- T24 done: created mobile rep app prototype at `/mobile` (server component `src/app/mobile/page.tsx`, client component `src/app/mobile/MobileApp.tsx`).
  Features:
  - Centred phone frame (~390×780 px, rounded-[2.5rem], dark border, inner scroll, top status bar, bottom 3-tab navigation: «Маршрут», «Визит», «Заказ»).
  - Tab «Маршрут»: list of the day's outlets (planned time, outlet name, address, status badges: выполнен / пропущен / предстоит; tap selects outlet and opens «Визит»).
  - Tab «Визит»: outlet info, GPS check-in button simulating coordinates and distance check against DEFAULT_CONFIG.gpsMaxDistanceM (green «В точке: N м» vs red «Слишком далеко от точки: N м — отметка уйдёт супервайзеру»), distant GPS simulator, Block «Ларь компании» (QR scan showing freezer id/model or «Ларь не найден — будет создано отклонение», photo capture with demo thumbnail).
  - Tab «Заказ»: 6 dairy SKUs with prices in ₸, +/- quantity steppers, live total formatted with fmtMoney, order submit button with confirmation «Заказ отправлен (демо)».
  - Added «Приложение ТП» link to Nav.tsx.
  - Added check_endpoint "/mobile" "Прототип экрана" to scripts/smoke.sh.
  - Verification: `npx tsc --noEmit && npx eslint src && npm run build` passed (/mobile in build output), all 43 vitest tests passed, `bash scripts/smoke.sh` exit 0.
- Assumptions: Picks rep r01 and date 2026-10-03 containing both an outlet with a company freezer (o003) and a kiosk without a freezer (o008), allowing testing both QR scan branches.
- Next: Check TASKS.md for further worker tasks or report IDLE.

## 2026-11-19 01:46 lead
- Merged gemini T24 (/mobile): tsc, eslint, 43 tests, smoke (incl. /mobile) pass; Playwright click-through
  route → GPS check-in (58 м green, simulated far → red) → freezer QR/photo → order, no console errors.
  Note: demo data has 2 visits per rep per day, so the route shows 2 stops — left as is (honest data).
- T27: DEMO.md step 7а (/mobile), alert-handling step already in step 3. Docs: /mobile in prototype list,
  SFA table row «нет мобильного приложения» → «есть только макет экрана», README routes + smoke, test
  count 34 → 43 everywhere. Next: T28 final checks + redeploy + DONE.

## 2026-11-19 04:50 lead
- Resumed after usage limit (paused 01:50–04:47). Worker branches had no new commits.
- T28: self-review of phase-2 code (Handled store, risk, finance panels) — no defects found (the code-review
  skill could not run: usage limit). tsc, eslint, 43 tests, finance verify, smoke (incl. /mobile) pass.
  vercel deploy --prod → https://puls-prodazh-nine.vercel.app; Playwright on prod: /mobile, /finance
  breakeven + 81 600 000, handled alert survives reload, KPI 1 673 665 ₸ as in DEMO step 3.
- Screenshots retaken from production (old ones showed 7 002 665 ₸), added 08-prilozhenie-tp.png.
- Phase-2 acceptance re-checked line by line: finance sheets + verify ✓; numbers /finance = docs =
  summary.json ✓; risk KPI no double counting, write-offs at cost ✓; SFA comparison + 2 answers ✓;
  handled works on deploy after reload, tests green ✓; npm test + smoke green, prod shows new version ✓.
  Creating night/DONE.

## 2026-11-19 06:57 claude (interactive, phase 3)
- Owner asked to close all gaps from the self-review. Done: finance ramp-up (6 мес.), freezer seasonality
  guard, /import (CSV + second-region example), closed loop (outcomes of last month + SLA escalation),
  rep value on /mobile (route optimisation, bonus forecast, hints). Docs synced, screenshots retaken.
- Verified: tsc, eslint, 65 tests, finance verify, smoke (incl. /import, /settings); vercel deploy --prod,
  prod checked with Playwright (numbers match docs).
- Assumptions: bonus scheme is an example (150 000 ₸ base, 80% floor); demo "now" = 02.11.2026 10:00;
  SLA 24/72/120 h; seasonality threshold 50% vs 3-month average.
