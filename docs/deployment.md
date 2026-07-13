# SkillSphere Production Deployment Guide

This guide details steps to launch and manage SkillSphere in a containerized production environment.

## 1. Environment Secrets Setup
Create a production `.env` file at the root containing:
```env
DEBUG=False
SECRET_KEY=production-secure-random-key
ALLOWED_HOSTS=skillsphere.com
DB_HOST=db
DB_PORT=5432
DB_NAME=skillsphere
DB_USER=postgres
DB_PASSWORD=production-secure-password
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
AWS_ACCESS_KEY_ID=aws-access-key
AWS_SECRET_ACCESS_KEY=aws-secret-key
AWS_STORAGE_BUCKET_NAME=skillsphere-prod-bucket
```

## 2. Docker Deployment
Deploy the entire production stack using Docker Compose:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
This launches:
* **skillsphere-db-prod**: PostgreSQL database.
* **skillsphere-redis-prod**: Redis for channel layers & Celery queues.
* **skillsphere-backend-prod**: Daphne server.
* **skillsphere-worker-prod**: Celery worker executing async tasks.
* **skillsphere-beat-prod**: Celery Beat scheduler.
* **skillsphere-frontend-prod**: Nginx container serving Vite static bundle.
