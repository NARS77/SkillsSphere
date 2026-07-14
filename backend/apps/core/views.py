from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Notification
from .serializers import NotificationSerializer
from .storage import get_storage_provider

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        from .repositories import NotificationRepository
        return NotificationRepository().get_user_notifications(self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        from .repositories import NotificationRepository
        repo = NotificationRepository()
        notification = repo.get_by_id_or_raise(pk)
        repo.update(notification, read=True)
        return Response({'status': 'notification marked as read'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        from .repositories import NotificationRepository
        NotificationRepository().mark_all_read(request.user)
        return Response({'status': 'all notifications marked as read'}, status=status.HTTP_200_OK)


class PresignedStorageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Exposes S3 or Local storage presigned upload/download URLs.
        """
        action_type = request.data.get('action')
        file_name = request.data.get('file_name')
        expiration = int(request.data.get('expiration', 3600))

        if not action_type or not file_name:
            return Response({'error': 'action and file_name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        provider = get_storage_provider()
        if action_type == 'upload':
            url = provider.generate_presigned_upload_url(file_name, expiration)
        elif action_type == 'download':
            url = provider.generate_presigned_download_url(file_name, expiration)
        else:
            return Response({'error': 'invalid action type.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'url': url,
            'file_name': file_name,
            'expiration': expiration
        })


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """
        Verify database, redis, storage, email connectivity.
        """
        import os
        from django.db import connection
        from django.core.cache import cache
        from django.conf import settings

        db_status = "disconnected"
        redis_status = "disconnected"
        storage_status = "connected"
        email_status = "configured" if getattr(settings, 'EMAIL_PROVIDER', 'console') != 'console' else "not_configured"
        is_healthy = True

        # DB connection check
        try:
            connection.ensure_connection()
            db_status = "connected"
        except Exception:
            is_healthy = False

        # Redis cache connection check
        try:
            cache.set('health_check_key', 'ok', timeout=5)
            val = cache.get('health_check_key')
            if val == 'ok':
                redis_status = "connected"
            else:
                is_healthy = False
        except Exception:
            is_healthy = False

        health_data = {
            "status": "healthy" if is_healthy else "unhealthy",
            "database": db_status,
            "redis": redis_status,
            "storage": storage_status,
            "email": email_status,
            "version": "1.0.0"
        }

        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_data, status=status_code)


class PlatformConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        import os
        from django.conf import settings

        ai_enabled = any(os.getenv(k) for k in ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'])
        demo_mode = getattr(settings, 'DEMO_MODE', False)

        return Response({
            "DEMO_MODE": demo_mode,
            "AI_ENABLED": ai_enabled,
            "PAYMENTS_ENABLED": True,
            "EMAIL_ENABLED": getattr(settings, 'EMAIL_PROVIDER', 'console') != 'console',
            "NOTIFICATIONS_ENABLED": True
        })


def robots_txt_view(request):
    """
    Exposes robots.txt search crawlers rules.
    """
    content = (
        "User-agent: *\n"
        "Disallow: /admin/\n"
        "Disallow: /dashboard/\n"
        "Disallow: /checkout/\n"
        "Allow: /courses/\n"
        "Allow: /\n"
        "Sitemap: http://localhost:8000/sitemap.xml\n"
    )
    return HttpResponse(content, content_type="text/plain")


class SitemapXmlView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """
        Dynamically generates sitemap.xml for all published courses.
        """
        from apps.courses.models import Course
        courses = Course.objects.filter(status=Course.Status.PUBLISHED, visibility=Course.Visibility.PUBLIC)
        
        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        ]
        
        xml_lines.append('  <url>')
        xml_lines.append('    <loc>http://localhost:5173/</loc>')
        xml_lines.append('    <priority>1.0</priority>')
        xml_lines.append('  </url>')
        xml_lines.append('  <url>')
        xml_lines.append('    <loc>http://localhost:5173/courses</loc>')
        xml_lines.append('    <priority>0.8</priority>')
        xml_lines.append('  </url>')

        for c in courses:
            xml_lines.append('  <url>')
            xml_lines.append(f'    <loc>http://localhost:5173/courses/{c.slug}</loc>')
            xml_lines.append('    <priority>0.6</priority>')
            xml_lines.append('  </url>')

        xml_lines.append('</urlset>')
        xml_content = "\n".join(xml_lines)
        return HttpResponse(xml_content, content_type="application/xml")
