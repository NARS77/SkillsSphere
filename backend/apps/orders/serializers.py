from rest_framework import serializers
from apps.courses.serializers import CourseListSerializer
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    course_details = CourseListSerializer(source="course", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "course", "course_details", "price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    coupon_code = serializers.CharField(source="coupon.code", read_only=True)
    receipt_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "student",
            "total_amount",
            "status",
            "coupon",
            "coupon_code",
            "items",
            "receipt_pdf",
            "created_at",
        ]
        read_only_fields = ["student", "total_amount", "status"]

    def get_receipt_pdf(self, obj):
        if hasattr(obj, "payment") and obj.payment.receipt_pdf:
            return obj.payment.receipt_pdf.url
        return None
