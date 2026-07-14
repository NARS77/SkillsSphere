from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import DiscussionThread, DiscussionReply
from .serializers import DiscussionThreadSerializer, DiscussionThreadDetailSerializer, DiscussionReplySerializer
from .services import DiscussionService


class DiscussionThreadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = DiscussionThread.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course", "is_pinned"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DiscussionThreadDetailSerializer
        return DiscussionThreadSerializer

    def perform_create(self, serializer):
        course_id = serializer.validated_data["course"].id
        title = serializer.validated_data["title"]
        content = serializer.validated_data["content"]
        thread = DiscussionService.create_thread(course_id, self.request.user, title, content)
        serializer.instance = thread

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        voted = DiscussionService.toggle_vote_thread(request.user, pk)
        return Response({"voted": voted}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="pin")
    def pin(self, request, pk=None):
        pin_status = request.data.get("pin", True)
        DiscussionService.pin_thread(request.user, pk, pin_status)
        return Response(
            {"message": f"Thread {'pinned' if pin_status else 'unpinned'} successfully."}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="lock")
    def lock(self, request, pk=None):
        lock_status = request.data.get("lock", True)
        DiscussionService.lock_thread(request.user, pk, lock_status)
        return Response(
            {"message": f"Thread {'locked' if lock_status else 'unlocked'} successfully."}, status=status.HTTP_200_OK
        )


class DiscussionReplyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = DiscussionReply.objects.all()
    serializer_class = DiscussionReplySerializer

    def perform_create(self, serializer):
        thread_id = serializer.validated_data["thread"].id
        content = serializer.validated_data["content"]
        reply = DiscussionService.add_reply(thread_id, self.request.user, content)
        serializer.instance = reply

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        voted = DiscussionService.toggle_vote_reply(request.user, pk)
        return Response({"voted": voted}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        accept_status = request.data.get("accept", True)
        DiscussionService.accept_reply(request.user, pk, accept_status)
        return Response(
            {"message": f"Reply {'accepted' if accept_status else 'unaccepted'} successfully."},
            status=status.HTTP_200_OK,
        )
