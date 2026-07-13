# SkillSphere System Architecture

SkillSphere is structured as a modern, decoupled web application split into a React SPA frontend and a Django REST monolith backend with real-time push capabilities and asynchronous background job pipelines.

## Architectural Flow Diagram

```mermaid
graph TD
    Client[React SPA Client] -->|HTTPS REST / HTTP SSE| WebServer[Nginx Reverse Proxy]
    Client -->|WebSockets| WSServer[Daphne ASGI Layer]
    WebServer -->|API Route forwarding| Gunicorn[WSGI Application Server]
    WSServer -->|Channels NotificationConsumer| Redis[Redis Channel Layer]
    Gunicorn -->|Database Query| PostgreSQL[(PostgreSQL Database)]
    Gunicorn -->|Job Dispatch| RedisMessageBroker[(Redis Message Broker)]
    RedisMessageBroker -->|Asynchronous task queue| CeleryWorker[Celery Worker Cluster]
    CeleryWorker -->|S3 Upload / Signed URLs| ObjectStorage[AWS S3 / Cloudflare R2]
```

## Key Technologies
1. **Frontend**: Vite + React + Tailwind CSS + Lucide Icons + TanStack Query.
2. **Backend**: Python 3.12 + Django 5.0 + Django REST Framework + SimpleJWT.
3. **Real-time Server**: Daphne + Channels + Redis Channel Layer.
4. **Background Queue**: Celery + Redis.
5. **Asset Storage**: boto3 S3 Storage integrations.
