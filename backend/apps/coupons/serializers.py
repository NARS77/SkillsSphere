from rest_framework import serializers
from .models import Coupon

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'coupon_type', 'value', 'course', 'expiry_date', 'max_uses', 'uses_count']
