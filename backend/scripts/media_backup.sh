#!/bin/bash
# SkillSphere Media Folder Backup script
MEDIA_DIR=${MEDIA_DIR:-/app/media}
BACKUP_DIR="/backups/media"
mkdir -p "$BACKUP_DIR"

FILENAME="$BACKUP_DIR/media_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

echo "Packaging media backups to $FILENAME..."
tar -czf "$FILENAME" -C "$MEDIA_DIR" .

if [ $? -eq 0 ]; then
  echo "Media folder backup completed successfully!"
else
  echo "Error: Media folder backup failed!" >&2
  exit 1
fi
