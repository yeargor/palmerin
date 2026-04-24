#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/tmp/miniapp-local-preview.log"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="127.0.0.1"
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
python3 -m http.server "$PORT" --bind 0.0.0.0 >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Failed to start local server. Check: $LOG_FILE"
  exit 1
fi

LOCAL_URL="http://127.0.0.1:${PORT}/apps/web/index.html?startapp=club"
LAN_URL="http://${LAN_IP}:${PORT}/apps/web/index.html?startapp=club"

echo "Mini App preview is running."
echo "Desktop URL: ${LOCAL_URL}"
echo "Phone URL (same Wi-Fi): ${LAN_URL}"
echo "Log file: ${LOG_FILE}"
echo ""
echo "Chrome mobile emulation: F12 -> Toggle device toolbar -> choose iPhone/Pixel"
echo "Auto screenshots (for agent review): npm run capture:mobile"
echo "Press Ctrl+C to stop."

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$LOCAL_URL" >/dev/null 2>&1 || true
fi

wait "$SERVER_PID"
