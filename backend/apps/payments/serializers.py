from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'order', 'payment_provider', 'transaction_id', 'status', 'receipt_pdf', 'created_at']
