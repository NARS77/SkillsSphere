# SkillSphere Disaster Recovery Procedures

This document details database and media restore procedures.

## 1. Database Restoration
To restore a PostgreSQL database backup from a `.sql` dump file:
```bash
docker exec -i skillsphere-db-prod psql -U postgres -d skillsphere < /backups/db/db_backup_YYYYMMDD_HHMMSS.sql
```

## 2. Media Files Restoration
To extract a packaged media folder archive back to the media volume directory:
```bash
tar -xzf /backups/media/media_backup_YYYYMMDD_HHMMSS.tar.gz -C /app/media
```

## 3. Scheduled Backups cron job
Set a daily cron job to trigger backups at midnight:
```cron
0 0 * * * /app/backend/scripts/db_backup.sh && /app/backend/scripts/media_backup.sh
```
