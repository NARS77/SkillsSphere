import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from apps.courses.models import Course
from .services import CertificateService

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(name="certificates.generate_certificate_task")
def generate_certificate_task(student_id, course_id):
    """
    Asynchronously verify course completion requirements and issue certificates in background.
    """
    logger.info(f"Checking certificate eligibility for student ID {student_id} on course ID {course_id}")
    try:
        student = User.objects.get(id=student_id)
        course = Course.objects.get(id=course_id)
        cert = CertificateService.verify_and_issue_certificate(student, course)
        if cert:
            logger.info(f"Certificate successfully issued with ID {cert.certificate_id}")
            return cert.certificate_id
        else:
            logger.info("Student not eligible or certificate already issued.")
            return None
    except Exception as e:
        logger.error(f"Failed to generate certificate: {e}", exc_info=True)
        return None
