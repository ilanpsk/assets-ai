#!/bin/bash

set -e

# Change to project root
cd "$(dirname "$0")/.."

echo "🚀 IT Asset Manager - Full Stack Start"
echo "======================================="

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

echo ""
echo "📦 Starting backend services..."
cd it-asset-manager
$COMPOSE up --build -d

echo "⏳ Waiting for database to be ready..."
until $COMPOSE exec -T db pg_isready -U assetuser -d assetdb > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Database is ready!"

echo "📊 Running database migrations..."
$COMPOSE exec -T api alembic upgrade head

echo "🔧 Bootstrapping default data..."
$COMPOSE exec -T api python -m scripts.bootstrap

cd ..

echo ""
echo "======================================="
echo "✅ Backend is running!"
echo ""
echo "🌐 API:          http://localhost:8000"
echo "📚 Swagger Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Login credentials:"
echo "   Email:    admin@example.com"
echo "   Password: admin123"
echo ""
echo "📝 Backend logs:  cd it-asset-manager && docker compose logs -f"
echo "🛑 Stop backend:  cd it-asset-manager && docker compose down"
echo "======================================="
echo ""
echo "💡 To start frontend: cd frontend && npm run dev"
echo ""
