#!/bin/bash
set -e

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/annotation_app"

echo "💾 Creating backup..."
mkdir -p $BACKUP_DIR

# Backup MongoDB
echo "📦 Backing up MongoDB Atlas database..."
mongodump --uri "$MONGODB_URI" --out $BACKUP_DIR/mongodb

# Create backup info file
cat > $BACKUP_DIR/backup-info.txt << EOF
Backup created: $(date)
MongoDB URI: $MONGODB_URI
Database: annotation_app

To restore:
mongorestore --uri "$MONGODB_URI" $BACKUP_DIR/mongodb/annotation_app
EOF

echo ""
echo "✅ Backup complete: $BACKUP_DIR"
echo "📊 Backup size:"
du -sh $BACKUP_DIR
echo ""
echo "💡 To restore from this backup, run:"
echo "   mongorestore --uri \"$MONGODB_URI\" $BACKUP_DIR/mongodb/annotation_app"
