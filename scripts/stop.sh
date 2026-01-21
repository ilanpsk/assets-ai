#!/bin/bash

# Change to project root
cd "$(dirname "$0")/.."

echo "🛑 Stopping IT Asset Manager..."

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

cd it-asset-manager
$COMPOSE down

echo "✅ All services stopped."
