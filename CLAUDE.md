# CLAUDE.md — hackit

> Rules for AI coding agents. Terse and imperative: read every session.
> Map, don't wish: write concrete paths and commands, not vague advice.
> Add a line the moment the agent makes a mistake a rule could have prevented.
> Global behavior rules live in `~/.claude/CLAUDE.md`; don't repeat them here.

**Start here:** read `HANDOFF.md` (current state, what's left). Update it after
every finished task.

## What this is
- [TODO: one or two sentences — what hackit does and who uses it.]
- Repo: https://github.com/madiyar-abi/hackit (private), default branch `main`.

## Hackathon context
- [TODO: hackathon name, case, publish date/time.] Case → `night/SPEC.md`.
- Final deadline: **[TODO: date + time]**. Submission format: [TODO].
  Submission checklist: `HANDOFF.md` → "Deadline & submission".
- So: a working, demo-able end-to-end flow beats breadth of features, and the
  README run steps must always work — the jury opens the repo.

## Stack
- [TODO: language, framework, database, hosting.]

## Run / test / build
- Install: `[TODO]`
- Dev: `[TODO — command and local URL]`
- Test: `[TODO — full suite; how to run a single test]`
- Lint/format: `[TODO]`

## Where things live
- [TODO: e.g. "Business logic in `src/domain/`; routes are thin controllers in `src/api/`."]
- [TODO: data layer, migrations, generated code.]

## Conventions
- [TODO: naming, error handling, test placement, import style.]
- Commits: small, one logical change each, clear message.
- Work on a feature branch and open a PR into `main`; never push directly to `main`.

## Team / repo hygiene
- Personal editor and machine config stays out of git (`.vscode/`, `.idea/`,
  `.DS_Store`, `.env*`, `.claude/settings.local.json`, `CLAUDE.local.md`) —
  see `.gitignore`. Never commit files that only work on one machine.
- Secrets live in env vars only. Never write a real key into any tracked file.
- Personal notes for the agent go in `CLAUDE.local.md` (ignored), not here.

## Do NOT touch
- [TODO: generated files, legacy folders, infra/CI config — flag instead of editing.]

## Gotchas
- [TODO: anything the agent keeps getting wrong or can't infer from the code.]

## Overnight / autonomous runs
- Unattended runs follow `NIGHT.md` (launched by `scripts/night.sh`). If the
  prompt says "night run" or `night/SPEC.md` exists and is not DONE, read it first.

## When stuck
State the plan and the single least-certain assumption before writing more
than a few lines.
