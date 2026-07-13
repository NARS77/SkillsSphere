import logging
from .base import BaseNotificationProvider

logger = logging.getLogger(__name__)

class PushNotificationProvider(BaseNotificationProvider):
    """
    Mock Push Notification Provider.
    """
    def send(self, user, title: str, message: str, notification_type: str, **kwargs) -> bool:
        logger.info(f"[PUSH NOTIFICATION MOCK] Sent to user {user.username}: {title} - {message[:50]}")
        return True
