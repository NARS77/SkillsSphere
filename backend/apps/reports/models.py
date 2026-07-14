from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel


class Payout(BaseBusinessModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"

    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payouts")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    initiated_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-initiated_at"]

    def __str__(self):
        return f"Payout {self.id} for {self.instructor.username} (Amount: {self.amount}, Status: {self.status})"
