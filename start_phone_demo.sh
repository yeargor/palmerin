#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTTP_LOG="/tmp/miniapp-http.log"
TUNNEL_LOG="/tmp/miniapp-tunnel.log"
URL_FILE="/tmp/miniapp-url.txt"
HTTP_PID_FILE="/tmp/miniapp-http.pid"
TUNNEL_PID_FILE="/tmp/miniapp-tunnel.pid"
PORT="4173"

cleanup_old() {
  if [[ -f "$HTTP_PID_FILE" ]] && kill -0 "$(cat "$HTTP_PID_FILE")" 2>/dev/null; then
    kill "$(cat "$HTTP_PID_FILE")" || true
  fi
  if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
    kill "$(cat "$TUNNEL_PID_FILE")" || true
  fi
  rm -f "$HTTP_PID_FILE" "$TUNNEL_PID_FILE" "$URL_FILE"
}

cleanup_old

cd "$APP_DIR"

: > "$HTTP_LOG"
: > "$TUNNEL_LOG"

# Use setsid to detach processes from this shell so they keep running.
setsid -f bash -lc "cd \"$APP_DIR\" && python3 -m http.server \"$PORT\" --bind 0.0.0.0 >>\"$HTTP_LOG\" 2>&1"
sleep 1
HTTP_PID="$(pgrep -f "python3 -m http.server $PORT --bind 0.0.0.0" | head -n1 || true)"
if [[ -z "$HTTP_PID" ]]; then
  echo "HTTP server did not start. Check log: $HTTP_LOG"
  exit 1
fi
echo "$HTTP_PID" > "$HTTP_PID_FILE"

setsid -f bash -lc "npx --yes localtunnel --port \"$PORT\" >>\"$TUNNEL_LOG\" 2>&1"
sleep 2
TUNNEL_PID="$(pgrep -fa "localtunnel --port $PORT" | awk '{print $1}' | head -n1 || true)"
if [[ -z "$TUNNEL_PID" ]]; then
  echo "Tunnel process did not start. Check log: $TUNNEL_LOG"
  exit 1
fi
echo "$TUNNEL_PID" > "$TUNNEL_PID_FILE"

URL=""
for _ in $(seq 1 60); do
  if [[ -f "$TUNNEL_LOG" ]]; then
    URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.loca\.lt' "$TUNNEL_LOG" | tail -n1 || true)"
    if [[ -n "$URL" ]]; then
      break
    fi
  fi
  sleep 1
done

if [[ -z "$URL" ]]; then
  echo "Tunnel URL was not detected."
  echo "Check logs: $TUNNEL_LOG"
  exit 1
fi

echo "$URL" > "$URL_FILE"

PASS_HINT="$(curl -fsS https://loca.lt/mytunnelpassword 2>/dev/null || true)"

echo "Mini App demo is running."
echo "Local URL: http://127.0.0.1:${PORT}"
echo "Public URL: ${URL}"
if [[ -n "$PASS_HINT" ]]; then
  echo "Tunnel password (if asked by loca.lt): ${PASS_HINT}"
fi
echo "HTTP log: $HTTP_LOG"
echo "Tunnel log: $TUNNEL_LOG"
