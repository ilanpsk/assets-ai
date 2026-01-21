#!/bin/bash

set -e

# Change to project root
cd "$(dirname "$0")/.."

echo "🚀 IT Asset Manager - Development Mode"
echo "======================================="

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

# Start backend
echo ""
echo "📦 Starting backend..."
cd it-asset-manager
$COMPOSE up --build -d

echo "⏳ Waiting for database..."
until $COMPOSE exec -T db pg_isready -U assetuser -d assetdb > /dev/null 2>&1; do
    sleep 1
done

echo "📊 Running migrations..."
$COMPOSE exec -T api alembic upgrade head

echo "🔧 Bootstrapping data..."
$COMPOSE exec -T api python -m scripts.bootstrap

cd ..

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "======================================="
echo "✅ Backend running at http://localhost:8000"
echo ""
echo "🎨 Starting frontend..."
echo "======================================="

cd frontend
npm run dev
