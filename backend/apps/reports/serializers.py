from rest_framework import serializers
from .models import Payout

class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['id', 'instructor', 'amount', 'status', 'initiated_at', 'paid_at']
