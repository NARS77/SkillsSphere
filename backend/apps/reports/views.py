from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Payout
from .serializers import PayoutSerializer
from .services import ReportService


class PayoutViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Payout.objects.all()
    serializer_class = PayoutSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return Payout.objects.all()
        return Payout.objects.filter(instructor=user)

    @action(detail=False, methods=["get"], url_path="instructor-revenue")
    def instructor_revenue(self, request):
        if request.user.role != "INSTRUCTOR":
            return Response({"error": "Only instructors can access revenue details."}, status=status.HTTP_403_FORBIDDEN)
        stats = ReportService.get_instructor_revenue_stats(request.user)
        return Response(stats, status=status.HTTP_200_OK)
