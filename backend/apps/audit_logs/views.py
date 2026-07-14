from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        # Only admins can view audit logs
        user = self.request.user
        if user.role != "ADMIN":
            return AuditLog.objects.none()
        return AuditLog.objects.all()
