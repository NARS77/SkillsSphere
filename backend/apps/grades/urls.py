from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GradebookEntryViewSet

router = DefaultRouter()
router.register(r'gradebook', GradebookEntryViewSet, basename='gradebook')

urlpatterns = [
    path('', include(router.urls)),
]
