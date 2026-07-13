from .base import BaseNotificationProvider
from apps.core.models import Notification

class InAppNotificationProvider(BaseNotificationProvider):
    """
    In-App Notification Provider saving notification items directly to the database.
    """
    def send(self, user, title: str, message: str, notification_type: str, **kwargs) -> bool:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type
        )
        return True
