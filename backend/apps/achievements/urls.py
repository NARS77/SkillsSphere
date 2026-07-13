from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BadgeViewSet, UserAchievementViewSet

router = DefaultRouter()
router.register(r'badges', BadgeViewSet, basename='badge')
router.register(r'achievements', UserAchievementViewSet, basename='achievement')

urlpatterns = [
    path('', include(router.urls)),
]
