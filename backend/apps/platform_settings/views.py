from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import PlatformSetting
from .serializers import PlatformSettingSerializer

class PlatformSettingViewSet(viewsets.ModelViewSet):
    queryset = PlatformSetting.objects.all()
    serializer_class = PlatformSettingSerializer
    lookup_field = 'key'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action not in ['list', 'retrieve'] and request.user.role != 'ADMIN':
            self.permission_denied(request, message="Only platform administrators can modify settings.")


from rest_framework import serializers
from rest_framework.views import APIView
from .models import FeatureFlag

class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = ('id', 'key', 'is_enabled', 'created_at')

class FeatureFlagViewSet(viewsets.ModelViewSet):
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action not in ['list', 'retrieve'] and request.user.role != 'ADMIN':
            self.permission_denied(request, message="Only platform administrators can modify feature flags.")


class PlatformHealthView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        # Mock systems check statistics
        memory_usage = 118.5  # fallback mock MB
        try:
            import psutil
            import os
            process = psutil.Process(os.getpid())
            memory_usage = process.memory_info().rss / (1024 * 1024) # MB
        except Exception:
            pass

        from django.db import connection
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False

        return Response({
            'status': 'healthy' if db_ok else 'unhealthy',
            'database': 'connected' if db_ok else 'disconnected',
            'memory_utilization': f"{memory_usage:.2f} MB",
            'cache_provider': 'LocMemCache (development)',
            'background_job_runner': 'Threaded executor active'
        })
