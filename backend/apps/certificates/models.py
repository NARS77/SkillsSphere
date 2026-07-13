from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class Certificate(BaseBusinessModel):
    enrollment = models.OneToOneField(
        'enrollments.Enrollment',
        on_delete=models.CASCADE,
        related_name='certificate'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    certificate_id = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to='certificates/pdfs/', null=True, blank=True)
    verification_url = models.URLField(max_length=500, blank=True, default='')
    qr_code_image = models.ImageField(upload_to='certificates/qrcodes/', null=True, blank=True)

    def __str__(self):
        return f"Certificate {self.certificate_id} for {self.student.email} in {self.course.title}"
