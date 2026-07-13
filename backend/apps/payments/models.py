from django.db import models
from apps.core.models import BaseBusinessModel

class Payment(BaseBusinessModel):
    class Provider(models.TextChoices):
        STRIPE = 'STRIPE', 'Stripe'
        RAZORPAY = 'RAZORPAY', 'Razorpay'
        MOCK = 'MOCK', 'Mock Gateway'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='payment'
    )
    payment_provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        default=Provider.MOCK
    )
    transaction_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUCCESS
    )
    receipt_pdf = models.FileField(upload_to='payments/receipts/', null=True, blank=True)

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id} (Status: {self.status})"
