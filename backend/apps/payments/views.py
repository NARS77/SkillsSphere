from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.orders.serializers import OrderSerializer
from .models import Payment
from .serializers import PaymentSerializer
from .services import CommerceService

class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @action(detail=False, methods=['post'], url_path='checkout')
    def checkout(self, request):
        course_ids = request.data.get('course_ids', [])
        coupon_code = request.data.get('coupon_code')
        order = CommerceService.checkout(request.user, course_ids, coupon_code)
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='verify')
    def verify_payment(self, request):
        order_id = request.data.get('order_id')
        transaction_id = request.data.get('transaction_id')
        provider = request.data.get('payment_provider', Payment.Provider.MOCK)
        
        order = CommerceService.verify_and_complete_payment(order_id, transaction_id, provider)
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
