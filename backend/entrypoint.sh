#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
PORT=${PORT:-8000}

if [ "${RAILWAY_ENVIRONMENT}" = "production" ]; then
    # Production: no file watcher, use Railway-provided PORT
    exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
else
    # Local dev: hot reload, watch only app/ to avoid inotify exhaustion
    exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload --reload-dir /app/app
fi
