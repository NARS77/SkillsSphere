from typing import List
from .in_app import InAppNotificationProvider
from .email import EmailNotificationProvider
from .push import PushNotificationProvider
from .sms import SMSNotificationProvider


class NotificationService:
    """
    Central orchestrator for routing notification payloads to registered providers.
    """

    _providers = {
        "in_app": InAppNotificationProvider(),
        "email": EmailNotificationProvider(),
        "push": PushNotificationProvider(),
        "sms": SMSNotificationProvider(),
    }

    @classmethod
    def send_notification(
        cls, user, title: str, message: str, notification_type: str, channels: List[str] = None, **kwargs
    ) -> None:
        """
        Sends the notification payload to a specified list of provider channels.
        """
        if not channels:
            channels = ["in_app"]

        for channel in channels:
            provider = cls._providers.get(channel)
            if provider:
                try:
                    provider.send(
                        user=user, title=title, message=message, notification_type=notification_type, **kwargs
                    )
                except Exception:
                    # Log errors but don't crash the core caller pipeline
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to route notification through channel '{channel}'", exc_info=True)
