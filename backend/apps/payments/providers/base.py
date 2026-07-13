from abc import ABC, abstractmethod

class BasePaymentProvider(ABC):
    """
    Abstract Base Class representing a payment gateway integration interface.
    """
    @abstractmethod
    def initiate_payment(self, amount: float, currency: str, order_id: str) -> dict:
        """
        Initiates a payment session and returns payload required by client side forms.
        """
        pass

    @abstractmethod
    def verify_payment(self, payload: dict) -> bool:
        """
        Verifies signatures/transaction identifiers to validate payment status.
        """
        pass
