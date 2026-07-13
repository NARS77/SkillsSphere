from .base import BasePaymentProvider
from .mock import MockPaymentProvider
from .stripe import StripePaymentProvider
from .razorpay import RazorpayPaymentProvider

def get_payment_provider(provider_name: str) -> BasePaymentProvider:
    """
    Factory resolving active payment provider adapter.
    """
    name = str(provider_name).upper()
    if name == 'STRIPE':
        return StripePaymentProvider()
    elif name == 'RAZORPAY':
        return RazorpayPaymentProvider()
    else:
        return MockPaymentProvider()
