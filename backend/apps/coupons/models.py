from django.db import models
from apps.core.models import BaseBusinessModel

class Coupon(BaseBusinessModel):
    class CouponType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        FIXED = 'FIXED', 'Fixed Discount'

    code = models.CharField(max_length=50, unique=True)
    coupon_type = models.CharField(
        max_length=20,
        choices=CouponType.choices,
        default=CouponType.PERCENTAGE
    )
    value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage off (e.g. 15.00) or fixed discount amount")
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupons',
        help_text="If set, coupon is only applicable to this course"
    )
    expiry_date = models.DateTimeField()
    max_uses = models.IntegerField(default=100)
    uses_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        scope = f"for {self.course.title}" if self.course else "Global"
        return f"Coupon {self.code} ({self.coupon_type} of {self.value}) - {scope}"
