from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Certificate
from .serializers import CertificateSerializer

class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    # AllowAny for verification lookup, but standard listing is authenticated
    permission_classes = [IsAuthenticated]
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'INSTRUCTOR':
            return Certificate.objects.filter(course__instructor=user)
        return Certificate.objects.filter(student=user)

    @action(detail=False, methods=['get'], url_path='verify/(?P<cert_id>[^/.]+)', permission_classes=[AllowAny])
    def verify_certificate(self, request, cert_id=None):
        certificate = get_object_or_404(Certificate, certificate_id=cert_id)
        serializer = CertificateSerializer(certificate)
        return Response(serializer.data, status=status.HTTP_200_OK)
