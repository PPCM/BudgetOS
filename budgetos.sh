#!/usr/bin/env bash
# BudgetOS server management script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/data/budgetos.pid"
LOG_FILE="$SCRIPT_DIR/data/budgetos.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load .env to read PORT (default 3000)
if [ -f "$SCRIPT_DIR/.env" ]; then
  PORT=$(grep -E '^PORT=' "$SCRIPT_DIR/.env" | cut -d'=' -f2 | tr -d '[:space:]')
fi
PORT="${PORT:-3000}"

print_status() {
  echo -e "${CYAN}[BudgetOS]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[BudgetOS]${NC} $1"
}

print_error() {
  echo -e "${RED}[BudgetOS]${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}[BudgetOS]${NC} $1"
}

# Check if the server process is running
is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    # Stale PID file
    rm -f "$PID_FILE"
  fi
  return 1
}

get_pid() {
  if [ -f "$PID_FILE" ]; then
    cat "$PID_FILE"
  fi
}

cmd_start() {
  if is_running; then
    print_warn "Server is already running (PID: $(get_pid))"
    return 0
  fi

  print_status "Starting server..."

  # Ensure data directory exists
  mkdir -p "$SCRIPT_DIR/data"

  # Start server in background
  cd "$SCRIPT_DIR"
  nohup node src/server.js >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  # Wait a moment and check it started correctly
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    print_success "Server started (PID: $pid)"
    print_status "Listening on http://0.0.0.0:${PORT}"
    print_status "Logs: $LOG_FILE"
  else
    rm -f "$PID_FILE"
    print_error "Server failed to start. Check logs:"
    tail -20 "$LOG_FILE"
    return 1
  fi
}

cmd_stop() {
  if ! is_running; then
    print_warn "Server is not running"
    return 0
  fi

  local pid
  pid=$(get_pid)
  print_status "Stopping server (PID: $pid)..."

  kill "$pid"

  # Wait for graceful shutdown (max 10s)
  local count=0
  while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
    sleep 1
    count=$((count + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    print_warn "Forcing shutdown..."
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  print_success "Server stopped"
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  if is_running; then
    print_success "Server is running (PID: $(get_pid))"
  else
    print_warn "Server is not running"
  fi
}

cmd_logs() {
  if [ ! -f "$LOG_FILE" ]; then
    print_warn "No log file found"
    return 0
  fi
  local lines="${1:-50}"
  tail -n "$lines" "$LOG_FILE"
}

cmd_logs_follow() {
  if [ ! -f "$LOG_FILE" ]; then
    print_warn "No log file found"
    return 0
  fi
  print_status "Following logs (Ctrl+C to stop)..."
  tail -f "$LOG_FILE"
}

cmd_reset() {
  local db_type="${DB_TYPE:-sqlite}"

  if is_running; then
    print_status "Stopping server first..."
    cmd_stop
  fi

  if [ "$db_type" = "sqlite" ]; then
    local db_path="${DB_PATH:-./data/budgetos.db}"
    # Resolve relative path
    if [[ "$db_path" != /* ]]; then
      db_path="$SCRIPT_DIR/$db_path"
    fi

    if [ -f "$db_path" ]; then
      rm -f "$db_path"
      print_status "SQLite database deleted: $db_path"
    fi
  else
    print_warn "Reset only supports SQLite. For $db_type, drop the database manually."
    return 1
  fi

  print_status "Starting server (migrations will run automatically)..."
  cmd_start

  print_status "Seeding database..."
  cd "$SCRIPT_DIR"
  node src/database/seed.js
  print_success "Database reset and seeded"
}

cmd_build() {
  print_status "Building frontend..."
  cd "$SCRIPT_DIR/client"
  npm run build
  print_success "Frontend built"

  if is_running; then
    print_status "Restarting server to serve new build..."
    cmd_restart
  fi
}

cmd_help() {
  echo ""
  echo -e "${CYAN}BudgetOS${NC} - Server management"
  echo ""
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  start       Start the server in background"
  echo "  stop        Stop the server"
  echo "  restart     Restart the server"
  echo "  status      Show server status"
  echo "  logs [n]    Show last n log lines (default: 50)"
  echo "  logs:follow Follow logs in real-time"
  echo "  reset       Reset SQLite database, re-seed and restart"
  echo "  build       Build frontend (and restart if running)"
  echo "  help        Show this help"
  echo ""
}

# Main entry point
case "${1:-help}" in
  start)       cmd_start ;;
  stop)        cmd_stop ;;
  restart)     cmd_restart ;;
  status)      cmd_status ;;
  logs)        cmd_logs "${2:-50}" ;;
  logs:follow) cmd_logs_follow ;;
  reset)       cmd_reset ;;
  build)       cmd_build ;;
  help|--help|-h) cmd_help ;;
  *)
    print_error "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
