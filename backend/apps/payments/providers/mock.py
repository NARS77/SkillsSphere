import uuid
from .base import BasePaymentProvider

class MockPaymentProvider(BasePaymentProvider):
    """
    Mock implementation of a payment provider for local development.
    """
    def initiate_payment(self, amount: float, currency: str, order_id: str) -> dict:
        return {
            "gateway": "MOCK",
            "order_id": order_id,
            "payment_id": f"mock_order_{uuid.uuid4().hex[:10]}",
            "amount": amount,
            "currency": currency,
            "status": "created"
        }

    def verify_payment(self, payload: dict) -> bool:
        # Mock payment verification is always true if a transaction ID or token is supplied
        return bool(payload.get("transaction_id") or payload.get("payment_id"))
