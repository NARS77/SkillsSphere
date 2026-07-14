from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Coupon
from .serializers import CouponSerializer
from .services import CouponService


class CouponViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def get_permissions(self):
        # Allow any user (even unauthenticated guest checking cart) to validate a coupon
        if self.action == "validate":
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["post"], url_path="validate")
    def validate(self, request):
        code = request.data.get("code")
        course_id = request.data.get("course_id")
        if not code:
            return Response({"error": "code is required."}, status=status.HTTP_400_BAD_REQUEST)
        coupon = CouponService.validate_coupon(code, course_id)
        serializer = CouponSerializer(coupon)
        return Response(serializer.data, status=status.HTTP_200_OK)
