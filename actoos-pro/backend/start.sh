#!/bin/sh
# Start script for ACTOOS PRO Backend
# Handles PORT environment variable from Railway

PORT="${PORT:-8001}"
echo "Starting ACTOOS PRO API on port $PORT..."
exec uvicorn server:app --host 0.0.0.0 --port "$PORT"
