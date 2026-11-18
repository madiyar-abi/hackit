#!/usr/bin/env bash
# scripts/smoke.sh — End-to-end smoke test for «Пульс продаж»
# Runs build, starts server on port 3100, curls all critical routes, verifies HTTP 200 and key strings.
# Compatible with macOS default Bash 3.2.
set -euo pipefail

PORT=3100
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
SERVER_PID=""

cleanup() {
  local exit_code=$?
  if [ -n "${SERVER_PID}" ]; then
    echo "Stopping Next.js server (PID ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  if [ "${exit_code}" -eq 0 ]; then
    echo "=== All smoke tests passed successfully! ==="
  else
    echo "=== Smoke tests FAILED with exit code ${exit_code} ===" >&2
  fi
  exit "${exit_code}"
}
trap cleanup EXIT INT TERM

echo "=== 1. Building Next.js production app ==="
npm run build

echo "=== 2. Starting Next.js production server on port ${PORT} ==="
npx next start -p "${PORT}" &
SERVER_PID=$!

echo "=== 3. Waiting for server to respond on ${BASE_URL} ==="
MAX_RETRIES=30
READY=0
for (( i=1; i<=MAX_RETRIES; i++ )); do
  if curl -s -f -o /dev/null "${BASE_URL}/" 2>/dev/null; then
    READY=1
    echo "Server is ready! (attempt ${i})"
    break
  fi
  sleep 1
done

if [ "${READY}" -ne 1 ]; then
  echo "Error: Server failed to start within ${MAX_RETRIES} seconds." >&2
  exit 1
fi

echo "=== 4. Checking endpoints ==="

check_endpoint() {
  local path="$1"
  local expected_text="${2:-}"
  local url="${BASE_URL}${path}"

  echo -n "Checking ${path} ... "
  local response_file
  response_file=$(mktemp -t smoke_resp.XXXXXX)

  local http_code
  http_code=$(curl -s -L -o "${response_file}" -w "%{http_code}" "${url}")

  if [ "${http_code}" != "200" ]; then
    echo "FAILED: HTTP status ${http_code} (expected 200)" >&2
    rm -f "${response_file}"
    exit 1
  fi

  if [ -n "${expected_text}" ]; then
    if ! grep -q "${expected_text}" "${response_file}"; then
      echo "FAILED: Expected text '${expected_text}' not found in response from ${path}" >&2
      rm -f "${response_file}"
      exit 1
    fi
  fi

  rm -f "${response_file}"
  echo "OK (200)"
}

# Required endpoints per T19
check_endpoint "/" "Ситуации из кейса"
check_endpoint "/alerts" ""
check_endpoint "/alerts?type=sales_drop" "Тимур Жумабеков"
check_endpoint "/reps" ""
check_endpoint "/reps/r05" ""
check_endpoint "/outlets/o023" ""
check_endpoint "/notifications" ""

# Check /finance if route exists
if [ -d "src/app/finance" ] || [ -f "src/app/finance/page.tsx" ]; then
  check_endpoint "/finance" ""
else
  echo "Skipping /finance (route does not exist yet)"
fi
