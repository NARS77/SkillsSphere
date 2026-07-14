import os
import sys
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from workspace root .env
load_dotenv(os.path.join(BASE_DIR.parent, '.env'))

# Add apps folder to sys.path to enable direct imports
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-change-in-prod')

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')]

# Application definition
INSTALLED_APPS = [
    # ASGI server (must be before django.contrib.staticfiles)
    'daphne',
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'channels',
    'drf_spectacular',
    
    # Custom apps
    'apps.core',
    'apps.authentication',
    'apps.courses',
    'apps.curriculum',
    'apps.enrollments',
    'apps.quizzes',
    'apps.assignments',
    'apps.grades',
    'apps.certificates',
    'apps.achievements',
    'apps.reviews',
    'apps.wishlist',
    'apps.discussions',
    'apps.messaging',
    'apps.coupons',
    'apps.orders',
    'apps.payments',
    'apps.reports',
    'apps.audit_logs',
    'apps.platform_settings',
    'apps.ai',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'skillsphere'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')]
CORS_ALLOW_CREDENTIALS = True

# CSRF Settings
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')]
RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL')
if RENDER_EXTERNAL_URL:
    CSRF_TRUSTED_ORIGINS.append(RENDER_EXTERNAL_URL)

# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '1000/min'
    }
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'SkillSphere API Documentation',
    'DESCRIPTION': 'Verifiable course tracking, curriculum building, communities, ecommerce, and AI Tutor endpoints.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# SimpleJWT Settings
access_lifetime_minutes = int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 30))
refresh_lifetime_days = int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=access_lifetime_minutes),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=refresh_lifetime_days),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# Django Channels / Redis Configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.getenv('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# Caching Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache' if os.getenv('DJANGO_ENV', 'development').lower() in ['development', 'testing'] else 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_CACHE_URL', 'redis://localhost:6379/3'),
    }
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', str(DEBUG)).lower() == 'true'


# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 1025))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'False').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'SkillSphere Team <noreply@skillsphere.com>')

# ==========================================
# Environment Dispatcher Overrides
# ==========================================
ENV = os.getenv('DJANGO_ENV', 'development').lower()

if 'test' in sys.argv or ENV == 'testing':
    # Load testing overrides (SQLite memory database and eager tasks for fast test execution)
    CELERY_TASK_ALWAYS_EAGER = True
    TESTING = True
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif ENV == 'production':
    # Load production overrides (Secure cookies, HSTS headers, disable Debug flags)
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
else:
    # Load development overrides
    DEBUG = True

# ==========================================
# Centralized Structured Logging Configuration
# ==========================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if not DEBUG else 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    }
}

# ==========================================
# Demo Mode & Deployment Settings
# ==========================================
DEMO_MODE = os.getenv('DEMO_MODE', 'False').lower() == 'true'

# Enforce middleware in all environments
MIDDLEWARE.append('apps.core.middleware.DemoModeMiddleware')

# Cloudinary Integration for Media Assets
CLOUDINARY_URL = os.getenv('CLOUDINARY_URL')
if CLOUDINARY_URL:
    # Inject before other apps to override static/media backends
    INSTALLED_APPS.insert(0, 'cloudinary')
    INSTALLED_APPS.insert(0, 'cloudinary_storage')
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"
    }

# Email Adapter Settings
EMAIL_PROVIDER = os.getenv('EMAIL_PROVIDER', 'smtp')
RESEND_API_KEY = os.getenv('EMAIL_API_KEY') or os.getenv('RESEND_API_KEY')

