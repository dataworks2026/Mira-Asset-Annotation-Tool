#!/bin/bash

# Configuration
EC2_HOST="ubuntu@<EC2_ELASTIC_IP>"
SSH_KEY="path/to/your-key.pem"

echo "📊 EC2 Resource Monitoring for Mira Annotation Tool"
echo "=================================================="
echo ""

ssh -i $SSH_KEY $EC2_HOST << 'ENDSSH'
# System Resources
echo "=== 💻 System Resources ==="
free -h
echo ""
echo "=== 📈 CPU Usage (Top 5 processes) ==="
top -bn1 | head -n 12 | tail -n 7
echo ""

# Docker stats
echo "=== 🐳 Docker Container Stats ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"
echo ""

# Disk usage
echo "=== 💾 Disk Usage ==="
df -h | grep -E '(Filesystem|/dev/)'
echo ""

# Container status
echo "=== ⚙️  Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Container health
echo "=== ❤️  Container Health ==="
for container in annotation-backend annotation-frontend; do
  health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "N/A")
  echo "$container: $health"
done
echo ""

# Recent logs
echo "=== 📋 Recent Backend Logs (last 20 lines) ==="
docker logs --tail 20 annotation-backend 2>&1 | sed 's/^/  /'
echo ""

echo "=== 📋 Recent Frontend Logs (last 20 lines) ==="
docker logs --tail 20 annotation-frontend 2>&1 | sed 's/^/  /'
echo ""

# Memory warnings
echo "=== ⚠️  Resource Warnings ==="
MEM_USED=$(free -m | awk 'NR==2{print $3}')
if [ $MEM_USED -gt 900 ]; then
  echo "❌ WARNING: Memory usage is ${MEM_USED}MB (> 900MB threshold)"
else
  echo "✅ Memory usage OK: ${MEM_USED}MB"
fi

DISK_USED=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USED -gt 80 ]; then
  echo "❌ WARNING: Disk usage is ${DISK_USED}% (> 80% threshold)"
else
  echo "✅ Disk usage OK: ${DISK_USED}%"
fi

# Check container restarts
BACKEND_RESTARTS=$(docker inspect --format='{{.RestartCount}}' annotation-backend 2>/dev/null || echo "0")
FRONTEND_RESTARTS=$(docker inspect --format='{{.RestartCount}}' annotation-frontend 2>/dev/null || echo "0")

if [ $BACKEND_RESTARTS -gt 0 ]; then
  echo "⚠️  Backend has restarted $BACKEND_RESTARTS times"
fi
if [ $FRONTEND_RESTARTS -gt 0 ]; then
  echo "⚠️  Frontend has restarted $FRONTEND_RESTARTS times"
fi

ENDSSH

echo ""
echo "=================================================="
echo "✅ Monitoring complete"
