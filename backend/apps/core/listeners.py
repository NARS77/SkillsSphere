import logging
from django.dispatch import receiver
from apps.core import events
from apps.certificates.tasks import generate_certificate_task
from apps.core.notifications import NotificationService

logger = logging.getLogger(__name__)

@receiver(events.course_completed)
def handle_course_completed(sender, student, course, **kwargs):
    """
    Decoupled listener responding to Course Completed signals.
    """
    logger.info(f"Event Received: Course '{course.title}' completed by student {student.username}.")
    
    # 1. Trigger certificate generation Celery task
    generate_certificate_task.delay(str(student.id), str(course.id))
    
    # 2. Dispatch completion notification
    NotificationService.send_notification(
        user=student,
        title="Course Completed!",
        message=f"Congratulations! You completed '{course.title}'. We are generating your certificate now.",
        notification_type="COURSE_COMPLETION",
        channels=['in_app', 'email']
    )
