#!/usr/bin/env bash
# Unit tests for budgetos.sh server management script
#
# Usage: bash tests/scripts/budgetos-sh.test.sh
#
# These tests verify each command of the budgetos.sh script
# using a real server instance on a temporary SQLite database.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUDGETOS="$PROJECT_DIR/budgetos.sh"

# Use a temporary database to avoid touching the real one
export DB_TYPE=sqlite
export DB_PATH="$PROJECT_DIR/data/budgetos_test_cli.db"

PASS=0
FAIL=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$expected" = "$actual" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       expected: '$expected'"
    echo -e "       actual:   '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local test_name="$1"
  local needle="$2"
  local haystack="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       expected to contain: '$needle'"
    echo -e "       output: '$haystack'"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_exists() {
  local test_name="$1"
  local filepath="$2"
  TOTAL=$((TOTAL + 1))
  if [ -f "$filepath" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       file not found: '$filepath'"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_not_exists() {
  local test_name="$1"
  local filepath="$2"
  TOTAL=$((TOTAL + 1))
  if [ ! -f "$filepath" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name"
    echo -e "       file should not exist: '$filepath'"
    FAIL=$((FAIL + 1))
  fi
}

# Cleanup function to ensure server is stopped after tests
cleanup() {
  "$BUDGETOS" stop >/dev/null 2>&1 || true
  rm -f "$DB_PATH"
  rm -f "$PROJECT_DIR/data/budgetos_test_cli.db"
}
trap cleanup EXIT

echo ""
echo -e "${CYAN}=== budgetos.sh unit tests ===${NC}"
echo ""

# --- Ensure clean state ---
cleanup 2>/dev/null || true

# ===========================
# Test: help command
# ===========================
echo -e "${CYAN}help${NC}"
output=$("$BUDGETOS" help 2>&1)
assert_contains "displays usage header" "Server management" "$output"
assert_contains "lists start command" "start" "$output"
assert_contains "lists stop command" "stop" "$output"
assert_contains "lists restart command" "restart" "$output"
assert_contains "lists status command" "status" "$output"
assert_contains "lists logs command" "logs" "$output"
assert_contains "lists reset command" "reset" "$output"
assert_contains "lists build command" "build" "$output"

# ===========================
# Test: unknown command
# ===========================
echo -e "${CYAN}unknown command${NC}"
output=$("$BUDGETOS" foobar 2>&1 || true)
assert_contains "shows error for unknown command" "Unknown command" "$output"

# ===========================
# Test: status when stopped
# ===========================
echo -e "${CYAN}status (stopped)${NC}"
output=$("$BUDGETOS" status 2>&1)
assert_contains "reports not running" "not running" "$output"

# ===========================
# Test: stop when not running
# ===========================
echo -e "${CYAN}stop (already stopped)${NC}"
output=$("$BUDGETOS" stop 2>&1)
assert_contains "reports not running on stop" "not running" "$output"

# ===========================
# Test: start
# ===========================
echo -e "${CYAN}start${NC}"
output=$("$BUDGETOS" start 2>&1)
assert_contains "reports server started" "Server started" "$output"
assert_contains "shows PID" "PID:" "$output"
assert_file_exists "creates PID file" "$PROJECT_DIR/data/budgetos.pid"
assert_file_exists "creates log file" "$PROJECT_DIR/data/budgetos.log"

# Verify server is actually running
pid=$(cat "$PROJECT_DIR/data/budgetos.pid")
TOTAL=$((TOTAL + 1))
if kill -0 "$pid" 2>/dev/null; then
  echo -e "  ${GREEN}PASS${NC} server process is alive"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${NC} server process is not alive"
  FAIL=$((FAIL + 1))
fi

# ===========================
# Test: start when already running
# ===========================
echo -e "${CYAN}start (already running)${NC}"
output=$("$BUDGETOS" start 2>&1)
assert_contains "reports already running" "already running" "$output"

# ===========================
# Test: status when running
# ===========================
echo -e "${CYAN}status (running)${NC}"
output=$("$BUDGETOS" status 2>&1)
assert_contains "reports running" "is running" "$output"
assert_contains "shows PID in status" "PID:" "$output"

# ===========================
# Test: logs
# ===========================
echo -e "${CYAN}logs${NC}"
output=$("$BUDGETOS" logs 5 2>&1)
assert_contains "shows server log output" "info" "$output"

# ===========================
# Test: stop
# ===========================
echo -e "${CYAN}stop${NC}"
output=$("$BUDGETOS" stop 2>&1)
assert_contains "reports server stopped" "Server stopped" "$output"
assert_file_not_exists "removes PID file" "$PROJECT_DIR/data/budgetos.pid"

# Verify process is gone
TOTAL=$((TOTAL + 1))
if ! kill -0 "$pid" 2>/dev/null; then
  echo -e "  ${GREEN}PASS${NC} server process is terminated"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${NC} server process still running after stop"
  FAIL=$((FAIL + 1))
fi

# ===========================
# Test: restart
# ===========================
echo -e "${CYAN}restart${NC}"
"$BUDGETOS" start >/dev/null 2>&1
old_pid=$(cat "$PROJECT_DIR/data/budgetos.pid")
output=$("$BUDGETOS" restart 2>&1)
assert_contains "restart reports stopped" "Server stopped" "$output"
assert_contains "restart reports started" "Server started" "$output"

new_pid=$(cat "$PROJECT_DIR/data/budgetos.pid")
TOTAL=$((TOTAL + 1))
if [ "$old_pid" != "$new_pid" ]; then
  echo -e "  ${GREEN}PASS${NC} restart creates a new process"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${NC} restart should create a new PID (old=$old_pid, new=$new_pid)"
  FAIL=$((FAIL + 1))
fi

# Cleanup after restart test
"$BUDGETOS" stop >/dev/null 2>&1

# ===========================
# Test: stale PID file handling
# ===========================
echo -e "${CYAN}stale PID file${NC}"
echo "999999" > "$PROJECT_DIR/data/budgetos.pid"
output=$("$BUDGETOS" status 2>&1)
assert_contains "handles stale PID correctly" "not running" "$output"
assert_file_not_exists "removes stale PID file" "$PROJECT_DIR/data/budgetos.pid"

# ===========================
# Test: logs when no log file
# ===========================
echo -e "${CYAN}logs (no file)${NC}"
rm -f "$PROJECT_DIR/data/budgetos.log"
output=$("$BUDGETOS" logs 2>&1)
assert_contains "reports no log file" "No log file" "$output"

# ===========================
# Summary
# ===========================
echo ""
echo -e "${CYAN}=== Results ===${NC}"
echo -e "Total: $TOTAL | ${GREEN}Pass: $PASS${NC} | ${RED}Fail: $FAIL${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
