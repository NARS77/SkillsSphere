import logging
from .base import BaseNotificationProvider

logger = logging.getLogger(__name__)


class SMSNotificationProvider(BaseNotificationProvider):
    """
    Mock SMS Notification Provider.
    """

    def send(self, user, title: str, message: str, notification_type: str, **kwargs) -> bool:
        logger.info(f"[SMS NOTIFICATION MOCK] Sent to user {user.username}: {title} - {message[:50]}")
        return True
