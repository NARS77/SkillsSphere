from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.exceptions import ValidationException
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer, ReviewReplySerializer
from .services import ReviewService


class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Review.objects.filter(is_hidden=False)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["course", "is_pinned"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ReviewCreateSerializer
        return ReviewSerializer

    def perform_create(self, serializer):
        student = self.request.user
        course_id = serializer.validated_data["course"].id
        rating = serializer.validated_data["rating"]
        content = serializer.validated_data.get("content", "")

        # Let Service handle business rules
        review = ReviewService.submit_review(student, course_id, rating, content)
        # Populate response representation
        serializer.instance = review

    @action(detail=True, methods=["post"], url_path="helpful")
    def helpful(self, request, pk=None):
        is_helpful = ReviewService.toggle_helpful(request.user, pk)
        return Response({"helpful": is_helpful}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="report")
    def report(self, request, pk=None):
        reason = request.data.get("reason", "")
        if not reason.strip():
            raise ValidationException("Reason is required to report a review.")
        ReviewService.report_review(request.user, pk, reason)
        return Response({"message": "Review reported successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        content = request.data.get("content", "")
        if not content.strip():
            raise ValidationException("Content is required to reply to a review.")
        reply = ReviewService.reply_to_review(request.user, pk, content)
        serializer = ReviewReplySerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pin")
    def pin(self, request, pk=None):
        pin_status = request.data.get("pin", True)
        ReviewService.pin_review(request.user, pk, pin_status)
        return Response(
            {"message": f"Review {'pinned' if pin_status else 'unpinned'} successfully."}, status=status.HTTP_200_OK
        )

    # Admin actions
    @action(detail=True, methods=["post"], url_path="hide")
    def hide(self, request, pk=None):
        if request.user.role != "ADMIN":
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        from django.shortcuts import get_object_or_404

        review = get_object_or_404(Review, id=pk)
        review.is_hidden = True
        review.save()

        # Audit Log
        from apps.audit_logs.services import AuditLogService

        AuditLogService.log_action(request.user, "ADMIN_HIDE_REVIEW", {"review_id": str(review.id)})

        return Response({"message": "Review hidden successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        if request.user.role != "ADMIN":
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        from django.shortcuts import get_object_or_404

        review = get_object_or_404(Review, id=pk)
        review.is_hidden = False
        review.save()
        return Response({"message": "Review restored successfully."}, status=status.HTTP_200_OK)
