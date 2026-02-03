#!/bin/bash
set -e

# Configuration
EC2_HOST="ubuntu@<EC2_ELASTIC_IP>"
SSH_KEY="path/to/your-key.pem"
REPO_DIR="/home/ubuntu/mira-annotation-tool"

echo "🚀 Deploying to EC2..."

# SSH and deploy
ssh -i $SSH_KEY $EC2_HOST << 'ENDSSH'
cd /home/ubuntu/mira-annotation-tool

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin feat/initial-project-setup

# Rebuild and restart containers
echo "🔨 Rebuilding Docker containers..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 10

# Show status
echo "📊 Container status:"
docker ps

# Show logs
echo ""
echo "📋 Recent Backend logs:"
docker logs --tail 50 annotation-backend

echo ""
echo "📋 Recent Frontend logs:"
docker logs --tail 50 annotation-frontend
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend: https://annotation.yourdomain.com"
echo "🔧 Backend Health: https://api.annotation.yourdomain.com/api/health"
