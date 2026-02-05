#!/bin/bash
# Database Restore Script
# Usage: ./restore-database.sh <backup_file.sql.gz>

if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.gz 2>/dev/null || echo "No backups found in backups/"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
source apps/server/.env

echo "⚠️  WARNING: This will REPLACE the current database with the backup."
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "📦 Extracting backup..."
TEMP_FILE=$(mktemp)
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

echo "🔄 Restoring database..."
psql "$DATABASE_URL" < "$TEMP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    rm "$TEMP_FILE"
else
    echo "❌ Restore failed!"
    rm "$TEMP_FILE"
    exit 1
fi
