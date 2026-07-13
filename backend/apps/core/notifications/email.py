from .base import BaseNotificationProvider
from apps.core.tasks import send_email_task

class EmailNotificationProvider(BaseNotificationProvider):
    """
    Email Notification Provider leveraging Celery to dispatch asynchronous emails.
    """
    def send(self, user, title: str, message: str, notification_type: str, **kwargs) -> bool:
        if not user.email:
            return False
        # Dispatch background Celery task
        send_email_task.delay(
            subject=title,
            message=message,
            recipient_list=[user.email]
        )
        return True
