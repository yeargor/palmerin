#!/usr/bin/env bash
set -euo pipefail

HTTP_PID_FILE="/tmp/miniapp-http.pid"
TUNNEL_PID_FILE="/tmp/miniapp-tunnel.pid"

stop_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
      sleep 0.5
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" || true
      fi
    fi
    rm -f "$file"
  fi
}

stop_pid_file "$HTTP_PID_FILE"
stop_pid_file "$TUNNEL_PID_FILE"

echo "Mini App demo processes stopped."
