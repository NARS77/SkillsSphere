from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.exceptions import ValidationException
from .models import Coupon


class CouponService:
    @staticmethod
    def validate_coupon(code, course_id=None):
        coupon = Coupon.objects.filter(code__iexact=code).first()
        if not coupon:
            raise ValidationException("Invalid coupon code.")

        if coupon.expiry_date < timezone.now():
            raise ValidationException("This coupon has expired.")

        if coupon.uses_count >= coupon.max_uses:
            raise ValidationException("This coupon usage limit has been reached.")

        if coupon.course_id and course_id and str(coupon.course_id) != str(course_id):
            raise ValidationException("This coupon is not applicable to the selected course.")

        return coupon
