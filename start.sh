#!/bin/sh
set -e

# If alembic_version table doesn't exist or is empty, stamp at 003
# (init.sql creates the base schema equivalent to migrations 000-003)
CURRENT=$(alembic current 2>/dev/null | grep -oE '[0-9]+' | head -1)

if [ -z "$CURRENT" ]; then
  echo "[start.sh] No alembic version found — stamping at 003 (init.sql baseline)"
  alembic stamp 003
fi

echo "[start.sh] Running alembic upgrade head..."
alembic upgrade head

echo "[start.sh] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
