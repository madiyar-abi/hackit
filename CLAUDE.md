# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# hackit

> Rules for AI coding agents. Terse and imperative: read every session.
> Map, don't wish: write concrete paths and commands, not vague advice.
> Add a line the moment the agent makes a mistake a rule could have prevented.
> Global behavior rules live in `~/.claude/CLAUDE.md`; don't repeat them here.

**Start here:** read `HANDOFF.md` (current state, what's left). Update it after
every finished task.

## What this is
- «Пульс продаж»: web app for a dairy producer's head of sales — detects sales-rep deviations
  (missed visits, sales drop, freezers, plan), explains causes by rules, notifies managers. Hack.IT case.
- Repo: https://github.com/madiyar-abi/hackit (private), default branch `main`.
- Deployed: https://puls-prodazh-nine.vercel.app (Vercel project `puls-prodazh`).

## Hackathon context
- Hack.IT, Business track: sales-team efficiency for a dairy producer. Case → `night/SPEC.md`
  (originals in `docs/case/`).
- Final deadline: **20.11.2026, 17:00**. Submission: docs per Hack.IT template, presentation,
  Excel financial model, product video — via Telegram.
  Submission checklist: `HANDOFF.md` → "Deadline & submission".
- So: a working, demo-able end-to-end flow beats breadth of features, and the
  README run steps must always work — the jury opens the repo.

## Stack
- Next.js 15 (App Router, TS), React 19, Tailwind 4, vitest 3; fonts via @fontsource (offline build).
- Finance model: Python + openpyxl (`finance/build_model.py`), verified with `formulas` in `finance/.venv`.
- No LLM / external APIs. UI and docs in Russian.

## Run / test / build
- Install: `npm install`
- Dev: `npm run dev` → http://localhost:3000
- Test: `npm test`; single file: `npx vitest run src/lib/engine/engine.test.ts`
- Lint/types: `npx eslint src && npx tsc --noEmit`; build: `npm run build`
- Finance: `python3 finance/build_model.py && finance/.venv/bin/python finance/verify.py`
- Watchdog script: `bash -n scripts/night.sh` (syntax). To exercise it without a real
  agent, point `CLAUDE_BIN` / `AGY_BIN` / `CODEX_BIN` at a stub and shrink the sleeps:
  `LIMIT_SLEEP`, `ERROR_SLEEP`, `IDLE_SLEEP`, `NEXT_SLEEP`, `NAP_POLL`, `RUN_POLL`.

## Where things live
- Domain types `src/lib/types.ts`; demo data generator `src/lib/data/generate.ts` (seeded; `SCENARIO` plants the case situations).
- Engine (pure functions + tests): `src/lib/engine/` — `config.ts` thresholds, `detect.ts`, `causes.ts`, `notify.ts`.
- UI gets data only via `src/lib/app-data.ts`; shared UI in `src/components/` (`ui.tsx`, `AlertCard.tsx`).
- Pages: `src/app/` (`/`, `/alerts`, `/reps`, `/reps/[id]`, `/outlets/[id]`, `/notifications`, `/finance`, `/settings`).
- `finance/financial-model.xlsx` and `finance/summary.json` are generated — edit `build_model.py`, not them.

## Conventions
- Tests next to code as `*.test.ts`; imports via `@/`. Money via `fmtMoney` (`src/lib/format.ts`).
- Numbers in `docs/*.md` must match the app output and `finance/summary.json`.
- Commits: small, one logical change each, clear message.
- Work on a feature branch and open a PR into `main`; never push directly to `main`.

## Team / repo hygiene
- Personal editor and machine config stays out of git (`.vscode/`, `.idea/`,
  `.DS_Store`, `.env*`, `.claude/settings.local.json`, `CLAUDE.local.md`) —
  see `.gitignore`. Never commit files that only work on one machine.
- Secrets live in env vars only. Never write a real key into any tracked file.
- Personal notes for the agent go in `CLAUDE.local.md` (ignored), not here.

## Do NOT touch
- `night/SPEC.md` — the case spec, source of truth; never edit it.
- `finance/financial-model.xlsx`, `finance/summary.json` — regenerate, never hand-edit.

## Gotchas
- `scripts/night.sh` is macOS-only (`date -j`, `date -r`, `caffeinate`).
- `night.sh` decides success/usage-limit/IDLE by grepping each engine's JSON output
  (`.night-logs/<name>-<engine>-run-N.json`); changing an engine's CLI flags or
  output format silently breaks limit detection and account switching.
- `next/font/google` needs internet at build — use @fontsource instead.
- `vercel link` appends `.env*` to `.gitignore` — already covered, revert that line.
- Rebuilding the xlsx changes its bytes (timestamps) — don't commit a rebuild without a real change.

## Overnight / autonomous runs
- Unattended runs follow `NIGHT.md` (launched by `scripts/night.sh`). If the
  prompt says "night run" or `night/SPEC.md` exists and is not DONE, read it first.
- How it fits together: `night.sh` re-prompts one headless session (claude / agy /
  codex) until `night/DONE`, `night/STOP` or `--until`; on a usage limit it rotates
  through every account × model, then sleeps. All shared state lives in tracked
  files: `night/TASKS.md` (tasks tagged `(lead)` / `(gemini)` / `(codex)`),
  `night/LOG.md` (append-only), `HANDOFF.md` (lead-owned).
- Branches: lead works on `night/<date>`; each worker on `night/<date>-<name>` in its
  own worktree (`../hackit-gemini`, `../hackit-codex`). Never check out another
  role's branch — it is open in that worktree. The lead merges worker branches.
- Session ids and run logs live in `.night-logs/` (git-ignored). A worker with
  nothing to do ends its reply with `IDLE` as the last line.

## When stuck
State the plan and the single least-certain assumption before writing more
than a few lines.
