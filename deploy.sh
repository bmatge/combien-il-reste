#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "=== Combien il en reste — deploy ==="

# Pull latest code
echo "→ git pull"
git pull --ff-only

# Build & restart
echo "→ docker compose build"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

echo "→ docker compose up -d"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

# Cleanup
echo "→ docker image prune"
docker image prune -f

echo "=== Deploy done — https://combien.matge.com ==="
