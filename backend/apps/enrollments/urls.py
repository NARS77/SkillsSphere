from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnrollmentViewSet, LearningProgressViewSet

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'learning', LearningProgressViewSet, basename='learning')

urlpatterns = [
    path('', include(router.urls)),
]
