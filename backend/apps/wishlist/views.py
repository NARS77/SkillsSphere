from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import WishlistItem
from .serializers import WishlistItemSerializer
from .services import WishlistService

class WishlistItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistItemSerializer

    def get_queryset(self):
        return WishlistItem.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'error': 'course_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        is_wishlisted = WishlistService.toggle_wishlist(request.user, course_id)
        return Response({'wishlisted': is_wishlisted}, status=status.HTTP_200_OK)
