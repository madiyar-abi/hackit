# HANDOFF.md — start here

> Current state of the project for the next person (human or agent).
> Read this first after `git pull`. Keep it short and true.
> Updated after every finished task (by the night agent or by you).

**Last updated:** 2026-11-19 01:45 · by: Claude (lead, night run, phase 2) · branch: `night/2026-11-19`

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
**Phase 2 in progress** (owner added it at 01:35, `night/SPEC.md` «Фаза 2», tasks T21–T28 in
`night/TASKS.md`). Phase 1 is done and deployed; the app keeps working after every merge.
The prod deploy still shows phase 1 until T28 redeploys.

## Done
- Next.js 15 app (`src/app/`): обзор `/`, отклонения `/alerts` (фильтры), сотрудники `/reps`,
  карточка ТП `/reps/[id]`, карточка точки `/outlets/[id]`, уведомления `/notifications`.
- Engine (`src/lib/engine/`): 6 detectors (5 case situations + GPS), cause rules with evidence,
  recommended actions, notification routing/texts, thresholds in `config.ts`. 34 vitest tests.
- Demo data (`src/lib/data/generate.ts`): 12 reps, 120 outlets, 95 freezers, 4 months, 948 visits;
  8 alerts found (3 critical / 3 high / 2 medium), 7 002 665 ₸/мес at risk.
- Finance model (`finance/`, by codex): budget 27 170 000 ₸ / 6 months; base net effect
  81 600 000 ₸/year, ROI 200,3%, payback 4,0 months after launch (phase 2: revenue built bottom-up
  25 ТП × 100 точек × 200 000 ₸ × 12 = 6 млрд ₸; write-offs at cost; breakeven: 1,18% sales uplift
  pays back within 12 months from start).
- Pages `/finance` (budget, scenarios, assumptions from `finance/summary.json`, by gemini) and
  `/settings` (live threshold playground, by codex). Finance v2: cash flow 24 months (payback month 10
  from project start, NPV 75 242 934 ₸ at 16%) and sensitivity sheet (codex).
- Docs: `docs/DOCUMENTATION.md` (all 16 template sections + screenshots), `docs/PITCH.md` (8 slides
  + jury Q&A), `docs/DEMO.md` (video script, ~3 min). `scripts/smoke.sh` — build + route checks.
- Deployed to Vercel (project `puls-prodazh`). Fresh clone → `npm install && npm run build && npm test` OK.

## In progress (phase 2)
- Done on the night branch: T22 «Продажи под угрозой» without double counting (3 646 665 ₸/мес lost
  sales + 2 894 000 ₸ plan gap shown separately), T23 «Отметить обработанным» (localStorage),
  T25 comparison with the SFA class + jury answers in DOCUMENTATION/PITCH.
- gemini: T24 `/mobile` rep-app prototype.
- lead next: T27 DEMO (/mobile step), T28 redeploy + DONE.
- T21 (codex) merged; T26 done: `/finance` shows revenue basis + breakeven, every number in docs
  synced with `finance/summary.json`.

## Left to do (humans, before 20.11 17:00)
1. Make the GitHub repo public (Settings → General → Danger zone → Change visibility).
2. Record the 2–3 min video by `docs/DEMO.md` (screen recording of the deployed app).
3. Slides from `docs/PITCH.md`; documentation into the Hack.IT template; fill team names.
4. Open `finance/financial-model.xlsx` in Excel, check sheets, Save — the file is generated with
   formulas only (Excel recalculates on open); saving stores the values so previews show numbers.
5. Optional: rehearse the Q&A in `docs/PITCH.md`; known soft spot — «Продажи под угрозой» sums
   the plan gap of the new rep (2,9 млн) with other alerts; loss reduction is computed on revenue.
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
npm test         # 34 unit tests
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
