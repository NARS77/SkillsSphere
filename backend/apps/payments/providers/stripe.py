import os
import logging
from django.conf import settings
from .base import BasePaymentProvider

logger = logging.getLogger(__name__)


class StripePaymentProvider(BasePaymentProvider):
    """
    Adapter implementing the BasePaymentProvider interface for Stripe.
    """

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.is_active = bool(self.api_key)
        self.client = None
        if self.is_active:
            try:
                import stripe

                stripe.api_key = self.api_key
                self.client = stripe
            except ImportError:
                self.is_active = False

    def initiate_payment(self, amount: float, currency: str, order_id: str) -> dict:
        if not self.is_active or not self.client:
            from .mock import MockPaymentProvider

            return MockPaymentProvider().initiate_payment(amount, currency, order_id)

        try:
            intent = self.client.PaymentIntent.create(
                amount=int(amount * 100),  # Stripe counts in cents
                currency=currency.lower(),
                metadata={"order_id": order_id},
            )
            return {
                "gateway": "STRIPE",
                "client_secret": intent.client_secret,
                "payment_id": intent.id,
                "amount": amount,
                "currency": currency,
            }
        except Exception as e:
            logger.error(f"Stripe initiate failed: {e}")
            from .mock import MockPaymentProvider

            return MockPaymentProvider().initiate_payment(amount, currency, order_id)

    def verify_payment(self, payload: dict) -> bool:
        if not self.is_active or not self.client:
            from .mock import MockPaymentProvider

            return MockPaymentProvider().verify_payment(payload)

        payment_id = payload.get("payment_id") or payload.get("transaction_id")
        if not payment_id:
            return False

        try:
            intent = self.client.PaymentIntent.retrieve(payment_id)
            return intent.status == "succeeded"
        except Exception as e:
            logger.error(f"Stripe verify failed: {e}")
            return False
