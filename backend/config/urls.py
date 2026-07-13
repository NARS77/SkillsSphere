from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        'name': 'SkillSphere API Monolith',
        'version': '1.0.0',
        'status': 'operational',
        'admin_panel': '/admin/',
        'endpoints': {
            'authentication': '/api/v1/auth/',
            'categories': '/api/v1/categories/',
            'catalog': '/api/v1/catalog/',
            'instructor_courses': '/api/v1/instructor/courses/'
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/', include('apps.courses.urls')),
    path('api/v1/', include('apps.curriculum.urls')),
    path('api/v1/', include('apps.enrollments.urls')),
    path('api/v1/', include('apps.quizzes.urls')),
    path('api/v1/', include('apps.assignments.urls')),
    path('api/v1/', include('apps.grades.urls')),
    path('api/v1/', include('apps.certificates.urls')),
    path('api/v1/', include('apps.achievements.urls')),
    path('api/v1/', include('apps.reviews.urls')),
    path('api/v1/', include('apps.wishlist.urls')),
    path('api/v1/', include('apps.discussions.urls')),
    path('api/v1/', include('apps.messaging.urls')),
    path('api/v1/', include('apps.coupons.urls')),
    path('api/v1/', include('apps.orders.urls')),
    path('api/v1/', include('apps.payments.urls')),
    path('api/v1/', include('apps.reports.urls')),
    path('api/v1/', include('apps.audit_logs.urls')),
    path('api/v1/', include('apps.platform_settings.urls')),
    path('api/v1/ai/', include('apps.ai.urls')),
    path('api/v1/', include('apps.core.urls')),
    
    # OpenAPI Schema and Swagger/ReDoc UIs
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
