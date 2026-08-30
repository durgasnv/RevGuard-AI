#!/usr/bin/env bash
# Starts the RevGuard stack: FastAPI backend (:8000) + Vite frontend (:5173).
# Usage: bash run.sh
set -euo pipefail
cd "$(dirname "$0")"

VENV="${VENV:-$HOME/venvs/revguard}"
PY="$VENV/bin/python"

# --- environment bootstrap -------------------------------------------------
if [ ! -x "$PY" ]; then
  echo "[revguard] creating python env at $VENV ..."
  bash backend/setup_env.sh "$VENV"
fi

if [ ! -d rpaydp/node_modules ]; then
  echo "[revguard] installing frontend deps in rpaydp ..."
  (cd rpaydp && npm install --no-audit --no-fund)
fi

# --- cleanup ---------------------------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
  echo ""
  echo "[revguard] shutting down ..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- backend ---------------------------------------------------------------
echo "[revguard] starting backend on :8000 ..."
(cd backend && PYTHONPATH=. "$PY" -m uvicorn app.main:app --port 8000) &
BACKEND_PID=$!

for i in $(seq 1 30); do
  curl -sf -m 1 http://localhost:8000/health >/dev/null && break
  sleep 0.5
done

# --- frontend --------------------------------------------------------------
echo "[revguard] starting shadcn frontend (rpaydp) on :5173 ..."
(cd rpaydp && npm run dev -- --host 0.0.0.0 --port 5173) &
FRONTEND_PID=$!

echo ""
echo "[revguard] ready → http://localhost:5173   (Ctrl+C to stop)"
wait
