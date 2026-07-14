from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiscussionThreadViewSet, DiscussionReplyViewSet

router = DefaultRouter()
router.register(r"threads", DiscussionThreadViewSet, basename="thread")
router.register(r"replies", DiscussionReplyViewSet, basename="reply")

urlpatterns = [
    path("", include(router.urls)),
]
