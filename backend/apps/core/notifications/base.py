from abc import ABC, abstractmethod


class BaseNotificationProvider(ABC):
    """
    Abstract Base Class representing a notification provider gateway (Email, In-App, Push, SMS).
    """

    @abstractmethod
    def send(self, user, title: str, message: str, notification_type: str, **kwargs) -> bool:
        """
        Sends the notification to a specific user.
        """
        pass
