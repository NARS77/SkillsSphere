from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlatformSettingViewSet, FeatureFlagViewSet, PlatformHealthView

router = DefaultRouter()
router.register(r'settings', PlatformSettingViewSet, basename='setting')
router.register(r'feature-flags', FeatureFlagViewSet, basename='feature-flag')

urlpatterns = [
    path('admin-console/health/', PlatformHealthView.as_view(), name='platform-health'),
    path('', include(router.urls)),
]
