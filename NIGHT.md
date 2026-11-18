# NIGHT.md — autonomous overnight run

Protocol for unattended agent runs started by `scripts/night.sh`.
Nobody is awake to answer questions. You are re-prompted with "continue" after
every stop, usage-limit pause or crash until `night/DONE` exists or the deadline
(default 07:00) passes — so keep all state in files, not only in your context.
The prompt names the night branch (`night/<date>`) and, for a worker, its name
and branch (`night/<date>-<name>`); use exactly those names.

## Team
- **lead** — Claude Code (`--engine claude`), main checkout. Plans, does the hard
  and cross-cutting work, reviews and merges the workers' commits.
- Workers (optional, each in its own git worktree, own quota — they keep going
  while the lead waits out a limit; weaker than the lead: give them
  well-specified tasks):
  - **gemini** — Antigravity CLI (`--engine agy`), 3 Google accounts
    (`~/.agy-acc2`, `~/.agy-acc3`). Opus 4.6 (Thinking) → Gemini 3.8 Flash (High)
    on each account in turn. Worktree `../hackit-gemini`.
  - **codex** — Codex CLI (`--engine codex`), 2 ChatGPT Plus accounts
    (`~/.codex-acc1`, `~/.codex-acc2`). Worktree `../hackit-codex`.

## Files (all tracked in git)
- `night/SPEC.md` — the task spec. Source of truth. Never edit it.
- `night/TASKS.md` — task list: `- [ ] T1 (lead) <task> — files: <paths> — accept: <check>`.
  Mark `[x]` only after the check passed. Owner is `lead` or a worker name.
- `night/LOG.md` — append-only: timestamp (from `date '+%F %H:%M'`, never
  estimated), who (lead or worker name), what you did,
  what's next, every assumption you made instead of asking.
- `HANDOFF.md` (repo root) — human-readable state for the next person: Status,
  Done, In progress, Left to do, Decisions, How to run, Last updated. Must be
  true at any moment — the run can be killed at the deadline mid-task.
- `night/DONE` — create only when every acceptance criterion in SPEC.md is met
  and verified. Creating it ends the night run for everyone.

## Role: lead
1. First run: read `night/SPEC.md`. Write `night/TASKS.md`: small tasks (≤ ~1h
   each), each with the files it touches and a concrete acceptance check.
   If the prompt lists running workers, tag with a worker's name (e.g.
   `(gemini)`, `(codex)`) the tasks that are small, self-contained, touch files
   no other owner's task touches, and have a mechanical check (a test, a
   command). Give each worker its own area of files. Everything else is `(lead)`.
   Always end TASKS.md with two `(lead)` tasks for the jury materials (humans
   record the video and make the slides from them):
   - `docs/DEMO.md` — demo-video script: 2–3 min, numbered steps, exact clicks/
     commands and inputs, what to say at each step, which result to show.
   - `docs/PITCH.md` — slide outline, one heading per slide: problem → solution
     → live demo → how it works (architecture, stack) → results/metrics →
     what's next → team. Max ~4 bullets per slide, facts only from the code.
   Commit + push TASKS.md first — the workers start from it.
2. Work on the night branch (create from current HEAD if missing).
   Never commit to or push `main`. Never force-push.
3. Execute with subagents (superpowers `subagent-driven-development` /
   `dispatching-parallel-agents`): one subagent per task, independent tasks in
   parallel (max 3 at once — they share the usage limit), then review each
   result yourself before marking it done.
4. Test-first where the code is testable. Run the tests/build before every commit.
5. After each finished task: update TASKS.md + LOG.md + HANDOFF.md, commit, `git push`.
6. Every ~30 min: `git fetch`, merge each `origin/<night branch>-<worker name>`
   that exists, review the worker's diff, re-run tests, fix or revert what's
   broken, push. A worker task with no progress on its branch for > 1h → retag
   it `(lead)` and do it yourself.
7. All tasks done → re-read SPEC.md line by line, verify each requirement,
   fix gaps, update README run instructions, `docs/DEMO.md`, `docs/PITCH.md`
   and HANDOFF.md (incl. "How to run" and what a teammate should do next) so
   they match what actually works. Then create `night/DONE`, commit, push.

## Role: worker
Your name and branch are in the prompt (e.g. name `codex`, branch `night/<date>-codex`).
1. `git fetch`. Work only on your branch: the first time
   `git checkout -B <your branch> origin/<night branch>`. Never check out the
   lead's or another worker's branch — they are open in other worktrees.
   Before each task: `git fetch && git merge origin/<night branch>`.
2. Take only unchecked tasks tagged with your name, one at a time.
   If there are none (or TASKS.md doesn't exist yet), stop and make `IDLE` the
   last line of your reply — the script then retries in 5 min.
3. Touch only the files listed for your task. Test, mark `[x]`, append to
   LOG.md, commit, `git push -u origin <your branch>` after every task.
   Don't edit HANDOFF.md — the lead owns it. Never touch `main`.

## Priorities (hackathon — final deadline in HANDOFF.md)
A run ends at its `--until` time (default 07:00); the project has until the final deadline. Order tasks so that a
working end-to-end demo exists as early as possible and stays working after
every merge; features and polish come after. Keep README run steps true.

## Hard rules
- Never ask the user a question — choose the simplest reasonable option and log
  the assumption in LOG.md.
- Don't stop early: if you think you're done, verify against SPEC.md again.
- Stay inside this repo. No secrets in files. No destructive git (reset --hard
  on shared branches, force-push, branch deletion).
- Stuck on one task > 3 attempts → log why, mark it `[!]`, move to the next.
- Merge conflicts in `night/TASKS.md` / `night/LOG.md` are expected (everyone
  edits them): keep both sides — every task line, `[x]` beats `[ ]`, all log
  entries in time order. Never resolve by dropping the other side.

## How to launch (done by the human or by Claude when the spec arrives)
```bash
# 1. put the spec into night/SPEC.md, commit it on the night branch, push
B=night/$(date +%F)
# 2. lead — detached, survives closing the terminal; Mac on the charger, lid open
mkdir -p .night-logs && nohup scripts/night.sh --role lead --branch $B --workers "gemini,codex" \
  --until 07:00 > .night-logs/lead.out 2>&1 &
# 3. workers, each in its own worktree
for w in gemini codex; do git worktree add --detach ../hackit-$w origin/$B && mkdir -p ../hackit-$w/.night-logs; done
nohup ../hackit-gemini/scripts/night.sh --role worker --name gemini --engine agy --branch $B \
  --accounts "default,$HOME/.agy-acc2,$HOME/.agy-acc3" --until 07:00 > ../hackit-gemini/.night-logs/worker.out 2>&1 &
nohup ../hackit-codex/scripts/night.sh --role worker --name codex --engine codex --branch $B \
  --accounts "$HOME/.codex-acc1,$HOME/.codex-acc2" --until 07:00 > ../hackit-codex/.night-logs/worker.out 2>&1 &
# logins (one-time): agy: HOME=$HOME/.agy-accN ~/.gemini/bin/agy · codex: CODEX_HOME=$HOME/.codex-accN codex login --device-auth
# watch:  tail -f .night-logs/lead.out ../hackit-*/.night-logs/worker.out
# stop:   touch night/STOP ../hackit-*/night/STOP
```
