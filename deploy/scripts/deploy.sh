#!/bin/bash
set -e

echo "=== Kong Manager Deployment Script ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

# Kiểm tra nếu người dùng đã truyền DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL is not set. A local Postgres container will be used."
    # Chạy toàn bộ stack
    docker compose -f "$COMPOSE_FILE" up -d --build
else
    echo "DATABASE_URL is set. Using external database: $DATABASE_URL"
    # Chạy stack nhưng KHÔNG chạy postgres service, và truyền DATABASE_URL vào cho backend
    export DATABASE_URL=$DATABASE_URL
    docker compose -f "$COMPOSE_FILE" up -d --build --scale postgres=0 redis backend frontend
fi

echo "Deployment finished. Checking status..."
docker compose -f "$COMPOSE_FILE" ps
