# HANDOFF.md — start here

> Current state of the project for the next person (human or agent).
> Read this first after `git pull`. Keep it short and true.
> Updated after every finished task (by the night agent or by you).

**Last updated:** 2026-11-19 · by: Claude (setup) · branch: `main`

## Deadline & submission
**Final deadline: [TODO: date + time].** Case: [TODO: where/when it is published].
Submission format: [TODO].

- [ ] Working end-to-end demo flow
- [ ] `README.md`: what it is, how to run — the jury opens the repo
- [ ] GitHub repo viewable by the jury — **it's private now**: make it public
      (or otherwise give access) before submitting
- [ ] Demo video — script: `docs/DEMO.md` (written by the night agent)
- [ ] Presentation — outline: `docs/PITCH.md` (written by the night agent)
- [ ] Everything submitted in the required format, shared "Anyone with the link — Viewer"

## Status
Setup is done, no product code yet. Waiting for the case — it goes into
`night/SPEC.md` and the agent run starts from there.

## Done
- Repo https://github.com/madiyar-abi/hackit, same setup as `genesis`:
  `.gitignore` for personal/editor files, `README.md`, `CLAUDE.md` (agent rules).
- Autonomous run: `NIGHT.md` (protocol) + `scripts/night.sh` (watchdog: switches
  model/account on usage limits, sleeps 1h when all are exhausted, stops at `--until`).
- Team: lead = Claude Code; workers = `gemini` (Antigravity CLI, 3 Google
  accounts, Opus 4.6 → Gemini Flash) and `codex` (Codex CLI, 2 ChatGPT Plus
  accounts), each in its own worktree (`../hackit-gemini`, `../hackit-codex`) and branch.

## In progress
- Nothing — waiting for the case.

## Left to do
- Full task list with acceptance checks: `night/TASKS.md` (created when the case arrives).
- Fill the `[TODO]` sections in `CLAUDE.md` and above once the case/stack are known.

## Decisions & assumptions
- Work goes through branches + PRs into `main`; nobody pushes to `main` directly.
- Agents never ask questions; every assumption is logged in `night/LOG.md`.

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
