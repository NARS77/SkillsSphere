from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, PublicCourseViewSet, InstructorCourseViewSet
from .search_views import GlobalSearchView, SavedSearchViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'catalog', PublicCourseViewSet, basename='catalog')
router.register(r'instructor/courses', InstructorCourseViewSet, basename='instructor-course')
router.register(r'saved-searches', SavedSearchViewSet, basename='saved-search')

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('', include(router.urls)),
]
