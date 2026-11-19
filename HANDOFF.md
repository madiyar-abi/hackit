# HANDOFF.md — start here

> Current state of the project for the next person (human or agent).
> Read this first after `git pull`. Keep it short and true.
> Updated after every finished task (by the night agent or by you).

**Last updated:** 2026-11-19 · by: Claude · branch: `main` (PR #1 merged the night branch)

## Deadline & submission
**Final deadline: 20.11.2026, 17:00** (late submissions rejected). Case: Business —
«Как повысить эффективность работы торговой команды?» (`night/SPEC.md`, PDFs in `docs/case/`).
Submission: Telegram @hackit_administration — team name, track (Business), documentation
per Hack.IT template, presentation, financial model (.xlsx), video of the product working.

- [x] Working end-to-end demo flow — https://puls-prodazh-nine.vercel.app
- [x] `README.md`: what it is, how to run, deploy link
- [ ] GitHub repo viewable by the jury — **it's private now**: make it public
      (or otherwise give access) before submitting
- [ ] Demo video — record by the script in `docs/DEMO.md`
- [ ] Presentation — make slides from `docs/PITCH.md` (8 slides, 5 min) + rehearse Q&A
- [ ] Documentation — `docs/DOCUMENTATION.md` (16 sections, screenshots in `docs/screenshots/`)
      → put into the Hack.IT template, fill team names (`[Название команды]`, `[Участник N]`)
- [x] Financial model — `finance/financial-model.xlsx` (open in Excel once and save so cached values appear)
- [ ] Sent to Telegram @hackit_administration before 20.11 17:00

## Status
**Phases 1–3 done.** Night run (phases 1–2) finished with `night/DONE`; phase 3 (jury-gap fixes, see
below) done interactively. Production https://puls-prodazh-nine.vercel.app shows the phase-3 version
(checked 2026-11-19 06:57: dashboard «Результат действий» + escalation, `/import` example → 6 alerts,
`/mobile` route optimisation + «Мой план», `/finance` with ramp-up). 65 tests, smoke, finance verify green.
What's left is for humans (video, slides, template, submission) — see "Left to do".

## Done
- Next.js 15 app (`src/app/`): обзор `/`, отклонения `/alerts` (фильтры), сотрудники `/reps`,
  карточка ТП `/reps/[id]`, карточка точки `/outlets/[id]`, уведомления `/notifications`.
- Engine (`src/lib/engine/`): 6 detectors (5 case situations + GPS), cause rules with evidence,
  recommended actions, notification routing/texts, thresholds in `config.ts`. 65 vitest tests (after phase 3).
- Demo data (`src/lib/data/generate.ts`): 12 reps, 120 outlets, 95 freezers, 4 months, 948 visits;
  8 alerts found (3 critical / 3 high / 2 medium), 7 002 665 ₸/мес at risk.
- Finance model (`finance/`): budget 27 170 000 ₸ / 6 months; base net effect 81 600 000 ₸/year at
  full run-rate. Current numbers (phase 3, with 6-month ramp-up) — see «Phase 3» below; older numbers
  in the phase 1/2 notes are superseded.
- Pages `/finance` (budget, scenarios, assumptions from `finance/summary.json`, by gemini) and
  `/settings` (live threshold playground, by codex). Finance v2: cash flow 24 months (payback month 10
  from project start, NPV 75 242 934 ₸ at 16%) and sensitivity sheet (codex).
- Docs: `docs/DOCUMENTATION.md` (all 16 template sections + screenshots), `docs/PITCH.md` (8 slides
  + jury Q&A), `docs/DEMO.md` (video script, ~3 min). `scripts/smoke.sh` — build + route checks.
- Deployed to Vercel (project `puls-prodazh`). Fresh clone → `npm install && npm run build && npm test` OK.

## Phase 2 (done 2026-11-19)
- Finance realism (codex): sheet «Обоснование выручки» (25 ТП × 100 точек × 200 000 ₸ × 12 = 6 млрд ₸,
  labelled as team assumptions), sheet «Безубыточность» (1,18% sales uplift pays back within 12 months
  from start; 4,18% with no freezer/write-off effect; without freezers payback 6,0 мес. → month 12),
  write-offs valued at cost. Base: 81 600 000 ₸/year, ROI 200,3%, payback 4,0 мес., NPV 75 242 934 ₸.
- «Продажи под угрозой» without double counting (`src/lib/engine/risk.ts`): 3 646 665 ₸/мес lost sales
  + 2 894 000 ₸ plan gap shown separately.
- «Отметить обработанным» / «Вернуть» on every alert card (localStorage), handled alerts in a separate
  dimmed block, dashboard counters/KPI count open alerts only.
- `/mobile` rep-app screen prototype (gemini); `/finance` panels «Откуда 6 млрд ₸» and «Безубыточность».
- Docs: SFA-class comparison + jury answers («чем вы лучше готовых систем?», «откуда 6 млрд?»),
  DEMO steps for alert handling and `/mobile`, all numbers synced, screenshots retaken from production.

## Phase 3 (done 2026-11-19, interactive) — gaps found in self-review
- Finance ramp-up: effect grows linearly over 6 months after launch (`Допущения!B16`), OPEX from launch.
  Base: payback 6,8 мес. after launch (13th month from start), ROI over 12 months of operation 131,3%,
  NPV 58 327 221 ₸; pessimistic payback 11,3 мес.; breakeven (12 months after launch): 0% uplift needed
  with freezer+write-off effects, 3,0% without them; no freezers → 15th month. Same closed-form payback
  in Excel and Python, `verify.py` checks both and that the cash-flow month = 6 + ceil(payback).
- Seasonality guard: «ларь без продаж» is not raised when the other freezers also sell < 50% of their
  3-month average (`freezerSeasonalDropPct`); cause «Не сезонность: остальные лари продают — 95%».
- `/import`: CSV upload (reps/outlets/sales/plans/visits/freezers/managers, «;» or «,», RU dates),
  in-browser analysis, templates; independent «другой регион» example (Караганда) → 6 alerts.
  Round-trip test: demo → CSV → import gives identical alerts.
- Closed loop (`src/lib/engine/loop.ts`): `asOfPeriod` + detectors on September → 2 of 4 resolved
  (+1 385 000 ₸/мес), 2 persisting; SLA escalation (24/72/120 ч, demo now 02.11 10:00), recurring →
  escalated at once; «обработано» clears it. Demo data got 2 September deviations (r01 visits, o012 freezer);
  RNG order kept, so October numbers are unchanged except plan 69 170 000 ₸ (89%) and −2% vs September.
- `/mobile`: demo day = r03's weekly route (10 outlets); «Оптимизировать порядок» 21,4 → 10,6 км (≈26 мин);
  tab «Мой план»: 91% plan, bonus forecast 115 807 ₸ (example scheme), 455 000 ₸ to 100%, outlet hints.
- Docs/README/DEMO (steps 1, 7а, 7б)/PITCH (slides 3–5, 7 + 3 new jury answers) updated; screenshots
  01, 06, 08 retaken from prod, 09 (`/import`) and 10 («Мой план») added.

## Repo state
- Everything is in `main` (PR #1 merged `night/2026-11-19`). New work: branch from `main`, PR back into `main`.
- Team package (Word docs, finance, screenshots) was built from this state; rebuild it if docs change.

## In progress
- Nothing.

## Left to do (humans, before 20.11 17:00)
1. Make the GitHub repo public (Settings → General → Danger zone → Change visibility).
2. Record the 2–3 min video by `docs/DEMO.md` (screen recording of the deployed app).
3. Slides from `docs/PITCH.md`; documentation into the Hack.IT template; fill team names.
4. Open `finance/financial-model.xlsx` in Excel, check sheets, Save — the file is generated with
   formulas only (Excel recalculates on open); saving stores the values so previews show numbers.
5. Rehearse the Q&A in `docs/PITCH.md` (incl. «чем вы лучше SFA?», «откуда 6 млрд?», «вы же сами
   заложили ситуации?», «как понять, что помогает?», «зимой лари?»). DEMO with all steps ≈ 3,5 мин —
   drop optional steps (2-доп., 6) if the video must be ≤ 3 мин.
6. Send everything to @hackit_administration.

## Decisions & assumptions
- Work goes through branches + PRs into `main`; nobody pushes to `main` directly.
- Agents never ask questions; every assumption is logged in `night/LOG.md`.
- Next.js web app + Excel model, Vercel, no LLM/external APIs, Russian UI/docs.
- Demo company «Молочный завод «Долина»», people and outlets are fictional; Almaty districts.
- Case situations 3 and 4 are each shown in two variants (freezer never installed / missing
  on audit; competitor product in freezer / outlet closed). Extra type: GPS check-in > 300 м.
- Severity routing: critical → head of sales (Telegram + e-mail) + supervisor; high →
  supervisor Telegram; medium → supervisor e-mail. Sending is simulated.

## How to run
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 43 unit tests
bash scripts/smoke.sh  # build + start + check all routes
npm run build    # production build
vercel deploy --prod   # redeploy (Vercel CLI logged in as the owner)
```
Finance model rebuild/verify: see `finance/README.md` (`python3 finance/build_model.py`,
verify needs `finance/.venv` with `formulas`).

## How to continue (process for the next person)
1. `git pull` → read this file → open `night/TASKS.md`.
2. Take the first unchecked task `- [ ]` (or a `[!]` one that got stuck — see
   `night/LOG.md` for why). Put your name next to it so nobody doubles up.
3. Branch from the latest work: `git checkout -b <your-name>/<task-id> origin/<night branch>`.
4. Do the task, check its acceptance criterion, mark it `[x]`.
5. Update this file (Status / Done / Left / Last updated), commit, push,
   open a PR into the night branch (or into `main` if it is merged).
