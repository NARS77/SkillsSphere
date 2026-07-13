# System Architecture Hardening & Refinement (Phase 8)

This document provides a comprehensive breakdown of the architectural refinements, patterns, and abstractions introduced during **Phase 8 (Engineering Hardening & Architecture Refinement)** of the SkillSphere platform.

---

## 1. Pluggable AI Gateway & Prompt Registry

We centralized prompt templates and isolated the core generation workflows from any specific LLM provider client:
* **Prompt Registry (`apps/ai/prompts.py`)**: Standard templates defined and rendered dynamically.
* **AI Provider Contract (`apps/ai/providers/base.py`)**: Abstract interface.
* **Adapters (`apps/ai/providers/`)**: `GeminiProvider`, `OpenAIProvider`, `ClaudeProvider`, `OllamaProvider`, and `MockProvider`.
* **AI Gateway (`apps/ai/services/ai_gateway.py`)**: Resolves active provider dynamically from setting `AI_PROVIDER`.

---

## 2. Pluggable Search Architecture

The view logic for search was decoupled into dedicated pluggable search engines:
* **Search Engine Contract (`apps/courses/search/base.py`)**: Abstract interface.
* **Keyword Search Engine (`apps/courses/search/keyword.py`)**: Uses Django Q filters.
* **Semantic Search Engine (`apps/courses/search/semantic.py`)**: Prepares vector matching.
* **Search Service (`apps/courses/search/service.py`)**: Formats results, selects active engine based on `SEARCH_PROVIDER`.

---

## 3. Pluggable Notification Providers

We replaced direct database notification writes with a multi-channel provider registry:
* **Notification Provider Contract (`apps/core/notifications/base.py`)**
* **Channels (`apps/core/notifications/`)**:
  * `in_app`: Writes Notification database records.
  * `email`: Dispatches async transactional emails via Celery background tasks.
  * `push`: Simulates mobile push notification channels.
  * `sms`: Simulates mobile text notifications.
* **Notification Service (`apps/core/notifications/service.py`)**: Routes notification payloads to standard provider channels.

---

## 4. Pluggable Payment Gateways

We extracted merchant-specific logic into clean provider adapters:
* **Payment Provider Contract (`apps/payments/providers/base.py`)**
* **Adapters (`apps/payments/providers/`)**: `StripePaymentProvider`, `RazorpayPaymentProvider`, and `MockPaymentProvider`.
* **Factory Resolver (`apps/payments/providers/__init__.py`)**: Routes transaction checks dynamically.

---

## 5. Pluggable Storage Providers

We isolated file writes to support cloud object storage natively:
* **Storage Provider Contract (`apps/core/storage.py`)**
* **Adapters**:
  * `LocalStorageProvider`
  * `S3StorageProvider` (AWS S3)
  * `R2StorageProvider` (Cloudflare R2 compat API)
  * `MinIOStorageProvider` (MinIO local/prod deployment compat API)
* **Factory Resolver (`get_storage_provider`)**: Selected based on environment settings.

---

## 6. Media Processing Pipeline

A dedicated media upload pipeline was introduced to unify safety and formatting checks:
* **Media Pipeline (`apps/core/media/pipeline.py`)**: Coordinates:
  1. Size and extension format validation.
  2. Security virus scanning hook (e.g. ClamAV).
  3. Compression and transcoding (resizing, video formatting).
  4. Metadata extraction and object storage saving.

---

## 7. Tagged & Versioned Caching Strategy

We introduced structured invalidation and versioning best practices:
* **Cache Service (`apps/core/cache.py`)**: Wraps Django Cache.
* **Cache Key Versioning**: Prevents state collision across deployments.
* **Cache Tagging**: Maps keys to tags (e.g., `categories`), allowing simple tag-based invalidations (`invalidate_tag`) when resources are modified.

---

## 8. Event-Driven Decoupling

We decoupled modules by replacing tight code execution paths with a centralized event-driven signals model:
* **Events Registry (`apps/core/events.py`)**: Declares custom Django Signals (e.g. `course_completed`).
* **Event Listeners (`apps/core/listeners.py`)**: Listens to signals and launches asynchronous tasks (like Celery certificate generation or notifications dispatch).

---

## 9. Dependency Injection & Standard Repositories

We reduced code duplication and improved testability:
* **Base Repository (`apps/core/repositories.py`)**: Generic type-safe CRUD operations.
* **Domain Repositories**: Encapsulates DB filtering and relations fetching (e.g. `NotificationRepository`, `EnrollmentRepository`).
* **Constructor-based Dependency Injection**: Services accept repositories/gateways as optional constructor arguments, allowing seamless mocking in unit tests.
