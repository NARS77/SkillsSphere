#!/bin/bash
# SkillSphere PostgreSQL Database Backup script
DB_NAME=${DB_NAME:-skillsphere}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

BACKUP_DIR="/backups/db"
mkdir -p "$BACKUP_DIR"

FILENAME="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Starting database backup to $FILENAME..."
PGPASSWORD=$DB_PASSWORD pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$FILENAME"

if [ $? -eq 0 ]; then
  echo "Database backup completed successfully!"
else
  echo "Error: Database backup failed!" >&2
  exit 1
fi
