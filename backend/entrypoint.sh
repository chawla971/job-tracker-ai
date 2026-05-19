#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
PORT=${PORT:-8000}

# No --reload anywhere — inotify watcher exhaustion was crashing the server
# and killing background embedding tasks before they could complete.
# Restart the backend manually after code changes: docker-compose restart backend
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
