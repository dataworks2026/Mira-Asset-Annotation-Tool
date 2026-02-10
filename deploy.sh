#!/bin/bash
set -e

echo "🚀 Deploying to production..."

cd /home/ubuntu/mira-annotation-tool

echo "📥 Pulling latest code..."
git pull origin feat/initial-project-setup

echo "🛑 Stopping containers..."
docker-compose -f docker-compose.prod.yml down

echo "🔨 Building and starting containers..."
NEXT_PUBLIC_API_URL=http://3.147.196.202:8000 docker-compose -f docker-compose.prod.yml up -d --build --force-recreate

echo "⏳ Waiting for services..."
sleep 15

echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker ps

echo ""
echo "🏥 Backend health:"
curl -s http://localhost:8000/api/health | jq . || echo "Backend not ready"

echo ""
echo "📋 Backend logs (last 20 lines):"
docker logs annotation-backend --tail 20

echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://3.147.196.202:3000"
echo "   Backend:  http://3.147.196.202:8000"
