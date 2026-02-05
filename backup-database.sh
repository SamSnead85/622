#!/bin/bash
# Database Backup Script - Run daily via cron
# Usage: ./backup-database.sh

BACKUP_DIR="/Users/ssweilem/Caravan-SocialNetwork/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
source /Users/ssweilem/Caravan-SocialNetwork/apps/server/.env

# Extract database connection details
DB_URL="$DATABASE_URL"

# Create backup using pg_dump
echo "Creating database backup..."
pg_dump "$DB_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "✅ Compressed: ${BACKUP_FILE}.gz"
    
    # Keep only last 30 days of backups
    find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
    echo "✅ Cleaned old backups (>30 days)"
else
    echo "❌ Backup failed!"
    exit 1
fi
