from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SectionViewSet, LessonViewSet, LessonResourceViewSet

router = DefaultRouter()
router.register(r"sections", SectionViewSet, basename="section")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"resources", LessonResourceViewSet, basename="resource")

urlpatterns = [
    path("curriculum/", include(router.urls)),
]
