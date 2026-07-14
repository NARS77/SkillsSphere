# SkillSphere Deployment & Operations Manual

This document provides a comprehensive operational guide for deploying, maintaining, and resetting the SkillSphere platform in production and demo environments.

---

## 🏗️ Architecture Overview

```
                      GitHub Repository
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
       Vercel (Frontend)                Render (Backend)
             │                                 │
             │                           ┌─────┴─────┐
             │                           ▼           ▼
             └────────────────────────► Neon DB   Upstash Redis
                                      (Postgres)     (Cache)
```

* **Frontend**: NextJS/Vite Single Page Application hosted on **Vercel**.
* **Backend**: Django REST Framework API hosted on **Render** (Web Service).
* **Database**: Serverless PostgreSQL hosted on **Neon**.
* **Caching & Celery Queues**: In-memory caching hosted on **Upstash Redis**.
* **Media Assets**: Images and profile assets hosted on **Cloudinary**.
* **Email dispatching**: Automated Resend transactional emails.

---

## ⚙️ Environment Variables

### Backend Configuration
```ini
# Core Configuration
SECRET_KEY=production-secure-random-string
DEBUG=False
ALLOWED_HOSTS=skillsphere-api.onrender.com,localhost

# Database Connections (Neon PostgreSQL)
DATABASE_URL=postgres://user:password@neon-host/db_name?sslmode=require

# Caching & Queue Services (Upstash Redis)
REDIS_URL=rediss://:password@upstash-host:6379/0

# Cloudinary Storage Configurations
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Email Delivery Configurations
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_your_resend_api_key

# Feature Flags & Demo Mode
DEMO_MODE=True
```

### Frontend Configuration
```ini
# API Gateway Target
VITE_API_URL=https://skillsphere-api.onrender.com/api/v1/

# Demo settings
VITE_DEMO_MODE=true
```

---

## 🔄 Database Seeding & Reset Commands

To reset and seed the demo environment with high-fidelity, production-grade mock data:

1. **Full Database Reset**:
   Truncates existing transactional tables and re-seeds cleanly.
   ```bash
   python manage.py reset_demo
   ```
2. **Execute Seeding Only**:
   Adds courses, users, analytics, timeline actions, and messages.
   ```bash
   python manage.py seed_demo
   ```

---

## 🚀 CI/CD Pipelines

Our automation workflow is powered by **GitHub Actions** (`.github/workflows/deploy.yml`):
* **On Push to `main`**:
  1. Spawns isolated Ubuntu runner.
  2. Runs backend migration checks and executes the full **52 unit tests** against local Postgres/Redis containers.
  3. Validates React compilation via Vite production build configurations.
  4. Automatically triggers Render/Vercel redeployment hooks upon success.

---

## 🛠️ Troubleshooting & Diagnostics

### 1. Verification Health Route
Query the public health check endpoint to inspect infrastructure state:
```bash
curl https://skillsphere-api.onrender.com/health/
```
Expected response:
```json
{
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "storage": "connected",
    "email": "configured",
    "version": "1.0.0"
}
```

### 2. Disallowed Host Exceptions
If the API returns `DisallowedHost` errors, check that the host header domain is registered in `ALLOWED_HOSTS` inside the environment parameters.
