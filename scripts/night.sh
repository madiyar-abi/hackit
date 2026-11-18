#!/bin/bash
# Overnight watchdog for Claude Code / Antigravity CLI (agy) / Codex CLI. See NIGHT.md.
# Re-prompts one headless session until night/DONE, night/STOP or the deadline.
# On a usage limit: next model/account; after the last one waits LIMIT_SLEEP (1h).
set -u

ROLE=lead
NAME=""
UNTIL=07:00
ENGINE=claude
WORKERS=""
BRANCH="night/$(date +%F)"
MODELS=""
ACCOUNTS="default"
usage() {
  echo "usage: $0 [--role lead|worker] [--name NAME] [--engine claude|agy|codex] [--until HH:MM]"
  echo "          [--branch night/YYYY-MM-DD] [--model \"A,B\"] [--accounts \"default,DIR\"] [--workers \"gemini,codex\"]"
  exit 2
}
while [ $# -gt 0 ]; do
  case "$1" in
    --role)        ROLE="$2"; shift 2 ;;
    --name)        NAME="$2"; shift 2 ;;      # worker name = its task tag and branch suffix
    --until)       UNTIL="$2"; shift 2 ;;
    --engine)      ENGINE="$2"; shift 2 ;;
    --workers)     WORKERS="$2"; shift 2 ;;   # lead only: names of workers running in parallel
    --with-worker) WORKERS="worker"; shift ;; # old flag: one worker named "worker"
    --branch)      BRANCH="$2"; shift 2 ;;
    --model)       MODELS="$2"; shift 2 ;;    # comma list: next one is used on a usage limit
    --accounts)    ACCOUNTS="$2"; shift 2 ;;  # agy: HOME dirs, codex: CODEX_HOME dirs; "default" = own login
    *) usage ;;
  esac
done
case "$ENGINE" in claude|agy|codex) ;; *) usage ;; esac
case "$ROLE" in lead|worker) ;; *) usage ;; esac
[ -z "$NAME" ] && NAME="$ROLE"
# agy default: strongest model first, fallback with its own quota second.
[ "$ENGINE" = agy ] && [ -z "$MODELS" ] && MODELS="Claude Opus 4.6 (Thinking),Gemini 3.8 Flash (High)"
[ "$ENGINE" = claude ] && ACCOUNTS="default"

# Slots = every account x every model, tried in order.
slot=1
count() { echo "$1" | awk -F, '{print NF}'; }
nth() { echo "$1" | cut -d, -f"$2"; }
n_models() { if [ -z "$MODELS" ]; then echo 1; else count "$MODELS"; fi; }
slot_count() { echo $(( $(count "$ACCOUNTS") * $(n_models) )); }
acc_idx() { echo $(( (slot - 1) / $(n_models) + 1 )); }
current_model() { [ -n "$MODELS" ] && nth "$MODELS" $(( (slot - 1) % $(n_models) + 1 )); }
current_home() { local a; a=$(nth "$ACCOUNTS" "$(acc_idx)"); [ "$a" = default ] || echo "$a"; }

CLAUDE_BIN="${CLAUDE_BIN:-claude}"                       # overridable for testing
AGY_BIN="${AGY_BIN:-$HOME/.gemini/bin/agy}"              # full paths: nohup shells may lack PATH
CODEX_BIN="${CODEX_BIN:-$(command -v codex || echo codex)}"
LIMIT_SLEEP="${LIMIT_SLEEP:-3600}"                       # wait after a usage limit on every slot
ERROR_SLEEP="${ERROR_SLEEP:-300}"                        # wait after other errors
IDLE_SLEEP="${IDLE_SLEEP:-300}"                          # worker with nothing to do
NEXT_SLEEP="${NEXT_SLEEP:-15}"                           # pause between normal runs
AGY_TURN_TIMEOUT="${AGY_TURN_TIMEOUT:-7200s}"            # agy turn cap (e.g. stuck waiting for a login)

cd "$(dirname "$0")/.." || exit 1
mkdir -p .night-logs night

# Keep the Mac awake for as long as this script runs.
caffeinate -dimsu -w $$ &

now() { date +%s; }
DEADLINE=$(date -j -f "%Y-%m-%d %H:%M" "$(date +%F) $UNTIL" +%s) || exit 1
[ "$DEADLINE" -le "$(now)" ] && DEADLINE=$((DEADLINE + 86400))
DEADLINE_HUMAN=$(date -r "$DEADLINE" "+%Y-%m-%d %H:%M")
log() { echo "[$(date '+%H:%M:%S')] [$NAME/$ENGINE] $*"; }

# Sleep, but never past the deadline and wake early on DONE/STOP.
nap() {
  local end=$(( $(now) + $1 ))
  [ "$end" -gt "$DEADLINE" ] && end=$DEADLINE
  while [ "$(now)" -lt "$end" ] && [ ! -e night/DONE ] && [ ! -e night/STOP ]; do sleep "${NAP_POLL:-20}"; done
}

if [ "$ROLE" = lead ]; then
  TEAM_NOTE=""
  if [ -n "$WORKERS" ]; then
    list=""; for w in $(echo "$WORKERS" | tr ',' ' '); do list="$list $w (branch $BRANCH-$w),"; done
    TEAM_NOTE=" Workers running in parallel:${list%,}. Assign tasks to them by tagging with the worker name, as NIGHT.md describes."
  fi
  FIRST_PROMPT="Read CLAUDE.md, HANDOFF.md and NIGHT.md, then follow NIGHT.md exactly as role=lead. Night branch: $BRANCH. The deadline is $DEADLINE_HUMAN. Work autonomously, use subagents, commit and push after every finished task.$TEAM_NOTE"
  NEXT_PROMPT="Continue the night run per NIGHT.md as role=lead (night branch $BRANCH, deadline $DEADLINE_HUMAN). Re-read night/TASKS.md and the end of night/LOG.md, then pick up where you left off.$TEAM_NOTE"
else
  ME="role=worker, worker name=$NAME: take only tasks tagged ($NAME); your branch is $BRANCH-$NAME (created from origin/$BRANCH); night branch $BRANCH"
  FIRST_PROMPT="Read CLAUDE.md, HANDOFF.md and NIGHT.md, then follow NIGHT.md exactly as $ME. The deadline is $DEADLINE_HUMAN. Work autonomously, commit and push after every finished task."
  NEXT_PROMPT="Continue the night run per NIGHT.md as $ME (deadline $DEADLINE_HUMAN). Fetch, re-read night/TASKS.md, then pick up where you left off."
fi

# One turn of the selected engine. $1 = prompt, $2 = session id (may be empty).
run_engine() {
  local prompt="$1" sid="$2" home model
  home=$(current_home); model=$(current_model)
  case "$ENGINE" in
    claude)
      if [ -n "$sid" ]; then set -- --resume "$sid"; else set -- --session-id "$NEW_SID"; fi
      [ -n "$model" ] && set -- "$@" --model "$model"
      "$CLAUDE_BIN" -p "$prompt" "$@" --dangerously-skip-permissions --output-format json ;;
    agy)
      if [ -n "$sid" ]; then set -- --conversation "$sid"; else set --; fi
      [ -n "$model" ] && set -- "$@" --model "$model"
      set -- -p "$prompt" "$@" --dangerously-skip-permissions --output-format json --print-timeout "$AGY_TURN_TIMEOUT"
      if [ -n "$home" ]; then HOME="$home" "$AGY_BIN" "$@"; else "$AGY_BIN" "$@"; fi ;;
    codex)
      if [ -n "$sid" ]; then set -- exec resume; else set -- exec; fi
      set -- "$@" --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --json
      [ -n "$model" ] && set -- "$@" -m "$model"
      [ -n "$sid" ] && set -- "$@" "$sid"
      set -- "$@" "$prompt"
      if [ -n "$home" ]; then CODEX_HOME="$home" "$CODEX_BIN" "$@"; else "$CODEX_BIN" "$@"; fi ;;
  esac
}

log "started ($ROLE), branch $BRANCH, deadline $DEADLINE_HUMAN"
i=0
while [ "$(now)" -lt "$DEADLINE" ]; do
  [ -e night/DONE ] && { log "night/DONE found — finished"; break; }
  [ -e night/STOP ] && { log "night/STOP found — stopping"; break; }
  # The lead may have finished in another worktree: check the pushed branch too.
  git fetch -q origin 2>/dev/null
  git cat-file -e "origin/$BRANCH:night/DONE" 2>/dev/null && { log "night/DONE on origin/$BRANCH — finished"; break; }
  i=$((i + 1))
  out=".night-logs/$NAME-$ENGINE-run-$i.json"
  SESSION_FILE=".night-logs/session-$NAME-$ENGINE-acc$(acc_idx)"   # conversations are per account
  sid=""; [ -s "$SESSION_FILE" ] && sid=$(cat "$SESSION_FILE")
  prompt="$FIRST_PROMPT"; [ -n "$sid" ] && prompt="$NEXT_PROMPT"
  if [ "$ENGINE" = claude ] && [ -z "$sid" ]; then NEW_SID=$(uuidgen | tr 'A-Z' 'a-z'); echo "$NEW_SID" > "$SESSION_FILE"; fi

  run_engine "$prompt" "$sid" < /dev/null > "$out" 2>&1 &
  pid=$!
  acc_note=""; [ "$(count "$ACCOUNTS")" -gt 1 ] && acc_note=" account: $(nth "$ACCOUNTS" "$(acc_idx)")"
  log "run $i (${sid:-new session})${MODELS:+ model: $(current_model)}$acc_note"

  # Wait for the run; hard stop at the deadline.
  while kill -0 "$pid" 2>/dev/null; do
    [ "$(now)" -ge "$DEADLINE" ] && { log "deadline — stopping the run"; kill -TERM "$pid" 2>/dev/null; }
    sleep "${RUN_POLL:-5}"
  done
  wait "$pid"; rc=$?

  failed=0
  case "$ENGINE" in
    claude)
      { [ "$rc" -ne 0 ] || grep -q '"is_error": *true' "$out"; } && failed=1 ;;
    agy)
      cid=$(grep -oE '"conversation_id": *"[^"]+"' "$out" | head -1 | sed -E 's/.*"([^"]+)"$/\1/')
      [ -n "$cid" ] && echo "$cid" > "$SESSION_FILE"
      { [ "$rc" -ne 0 ] || ! grep -q '"status": *"SUCCESS"' "$out"; } && failed=1 ;;
    codex)
      cid=$(grep -oE '"thread_id": *"[^"]+"' "$out" | head -1 | sed -E 's/.*"([^"]+)"$/\1/')
      [ -n "$cid" ] && echo "$cid" > "$SESSION_FILE"
      { [ "$rc" -ne 0 ] || grep -qE '"type": *"(turn\.failed|error)"' "$out"; } && failed=1 ;;
  esac

  if [ "$failed" -eq 1 ] && grep -qiE 'usage limit|hit your limit|limit reached|rate.?limit|429|overloaded|quota|resource.?exhausted|resets|authentication required|not logged in' "$out"; then
    if [ "$slot" -lt "$(slot_count)" ]; then
      slot=$((slot + 1)); log "usage limit — switching to: ${MODELS:+$(current_model) }(account $(nth "$ACCOUNTS" "$(acc_idx)"))"; nap "$NEXT_SLEEP"
    else
      slot=1; log "usage limit on every model/account (rc=$rc) — sleeping ${LIMIT_SLEEP}s"; nap "$LIMIT_SLEEP"
    fi
  elif [ "$failed" -eq 1 ]; then
    if grep -qiE 'no conversation found|session.*not found|thread.*not found' "$out"; then
      log "session lost — starting a fresh one"; rm -f "$SESSION_FILE"
    fi
    log "error rc=$rc (see $out) — sleeping ${ERROR_SLEEP}s"; nap "$ERROR_SLEEP"
  elif grep -qE '("|\\n)[*_` ]*IDLE[*_`. ]*(\\n)*"' "$out"; then   # IDLE as the reply's last line
    log "idle — sleeping ${IDLE_SLEEP}s"; nap "$IDLE_SLEEP"
  else
    nap "$NEXT_SLEEP"
  fi
done
log "exit"
