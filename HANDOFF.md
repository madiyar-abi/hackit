# HANDOFF.md — start here

> Current state of the project for the next person (human or agent).
> Read this first after `git pull`. Keep it short and true.
> Updated after every finished task (by the night agent or by you).

**Last updated:** 2026-11-19 00:25 · by: Claude (setup) · branch: `night/2026-11-19`

## Deadline & submission
**Final deadline: 20.11.2026, 17:00** (late submissions rejected). Case: Business —
«Как повысить эффективность работы торговой команды?» (`night/SPEC.md`, PDFs in `docs/case/`).
Submission: Telegram @hackit_administration — team name, track (Business), documentation
per Hack.IT template, presentation, financial model (.xlsx), video of the product working.

- [ ] Working end-to-end demo flow
- [ ] `README.md`: what it is, how to run — the jury opens the repo
- [ ] GitHub repo viewable by the jury — **it's private now**: make it public
      (or otherwise give access) before submitting
- [ ] Demo video — script: `docs/DEMO.md` (written by the night agent)
- [ ] Presentation — outline: `docs/PITCH.md` (written by the night agent)
- [ ] Documentation — draft `docs/DOCUMENTATION.md` → format it, fill team names
- [ ] Financial model — `finance/financial-model.xlsx`
- [ ] Sent to Telegram @hackit_administration before 20.11 17:00

## Status
Case received and written to `night/SPEC.md`. Night run (lead + gemini + codex)
starts 2026-11-19 ~00:30 on branch `night/2026-11-19`, until 07:00. No product code yet.

## Done
- Repo https://github.com/madiyar-abi/hackit, same setup as `genesis`:
  `.gitignore` for personal/editor files, `README.md`, `CLAUDE.md` (agent rules).
- Autonomous run: `NIGHT.md` (protocol) + `scripts/night.sh` (watchdog: switches
  model/account on usage limits, sleeps 1h when all are exhausted, stops at `--until`).
- Team: lead = Claude Code; workers = `gemini` (Antigravity CLI, 3 Google
  accounts, Opus 4.6 → Gemini Flash) and `codex` (Codex CLI, 2 ChatGPT Plus
  accounts), each in its own worktree (`../hackit-gemini`, `../hackit-codex`) and branch.

## In progress
- Night run: building the Next.js app + Excel financial model per `night/SPEC.md`.

## Left to do
- Full task list with acceptance checks: `night/TASKS.md` (created when the case arrives).
- Fill the `[TODO]` sections in `CLAUDE.md` and above once the case/stack are known.

## Decisions & assumptions
- Work goes through branches + PRs into `main`; nobody pushes to `main` directly.
- Agents never ask questions; every assumption is logged in `night/LOG.md`.
- Agreed with the owner: Next.js web app + Excel financial model, deploy to Vercel,
  no LLM/external APIs, docs/pitch as Markdown drafts, team names as placeholders,
  everything in Russian.

## How to run
- [TODO: install / dev / test commands — mirror of CLAUDE.md once known.]

## How to continue (process for the next person)
1. `git pull` → read this file → open `night/TASKS.md`.
2. Take the first unchecked task `- [ ]` (or a `[!]` one that got stuck — see
   `night/LOG.md` for why). Put your name next to it so nobody doubles up.
3. Branch from the latest work: `git checkout -b <your-name>/<task-id> origin/<night branch>`.
4. Do the task, check its acceptance criterion, mark it `[x]`.
5. Update this file (Status / Done / Left / Last updated), commit, push,
   open a PR into the night branch (or into `main` if it is merged).
