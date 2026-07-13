from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, PresignedStorageView, HealthCheckView, robots_txt_view, SitemapXmlView

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('storage/presigned/', PresignedStorageView.as_view(), name='storage-presigned'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('robots.txt', robots_txt_view, name='robots-txt'),
    path('sitemap.xml', SitemapXmlView.as_view(), name='sitemap-xml'),
]
