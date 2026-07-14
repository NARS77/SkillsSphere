import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name="core.send_email_task")
def send_email_task(subject, message, recipient_list, html_message=None):
    """
    Asynchronously send transactional emails to user(s) using Celery background processing.
    """
    logger.info(f"Dispatching async email to {recipient_list} with subject: '{subject}'")
    try:
        from apps.core.notifications.email_adapter import EmailProviderService

        success = EmailProviderService.send(
            subject=subject, message=message, recipient_list=recipient_list, html_message=html_message
        )
        if success:
            logger.info(f"Email successfully dispatched to {recipient_list}")
        else:
            logger.error(f"Email delivery reported failure for {recipient_list}")
        return success
    except Exception as e:
        logger.error(f"Failed to dispatch email to {recipient_list}: {e}")
        return False


@shared_task(name="core.system_cleanup_task")
def system_cleanup_task():
    """
    A scheduled Celery Beat job to clean up expired notifications.
    """
    logger.info("Executing scheduled system cleanup...")
    from django.utils import timezone
    from datetime import timedelta
    from apps.core.models import Notification

    cutoff = timezone.now() - timedelta(days=30)
    deleted_count, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    logger.info(f"Cleaned up {deleted_count} expired notification logs.")
    return deleted_count
