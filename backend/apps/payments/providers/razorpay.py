import os
import logging
from django.conf import settings
from .base import BasePaymentProvider

logger = logging.getLogger(__name__)


class RazorpayPaymentProvider(BasePaymentProvider):
    """
    Adapter implementing the BasePaymentProvider interface for Razorpay.
    """

    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        self.is_active = bool(self.key_id and self.key_secret)
        self.client = None
        if self.is_active:
            try:
                import razorpay

                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            except ImportError:
                self.is_active = False

    def initiate_payment(self, amount: float, currency: str, order_id: str) -> dict:
        if not self.is_active or not self.client:
            from .mock import MockPaymentProvider

            return MockPaymentProvider().initiate_payment(amount, currency, order_id)

        try:
            # Amount is in paisa for INR
            amount_paisa = int(amount * 100)
            order_data = {
                "amount": amount_paisa,
                "currency": currency.upper(),
                "receipt": order_id,
                "payment_capture": 1,
            }
            razorpay_order = self.client.order.create(data=order_data)
            return {
                "gateway": "RAZORPAY",
                "order_id": order_id,
                "razorpay_order_id": razorpay_order["id"],
                "amount": amount,
                "currency": currency,
            }
        except Exception as e:
            logger.error(f"Razorpay initiate failed: {e}")
            from .mock import MockPaymentProvider

            return MockPaymentProvider().initiate_payment(amount, currency, order_id)

    def verify_payment(self, payload: dict) -> bool:
        if not self.is_active or not self.client:
            from .mock import MockPaymentProvider

            return MockPaymentProvider().verify_payment(payload)

        razorpay_payment_id = payload.get("razorpay_payment_id")
        razorpay_order_id = payload.get("razorpay_order_id")
        razorpay_signature = payload.get("razorpay_signature")

        if not (razorpay_payment_id and razorpay_order_id and razorpay_signature):
            return False

        try:
            self.client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
            return True
        except Exception as e:
            logger.error(f"Razorpay signature verify failed: {e}")
            return False
