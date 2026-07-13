import uuid
from django.db import models

class UUIDModel(models.Model):
    """
    An abstract base class model that uses UUIDs for primary keys.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

class BaseBusinessModel(UUIDModel, TimeStampedModel):
    """
    An abstract model combining UUID and Timestamp fields, suitable for major domain entities.
    """
    class Meta:
        abstract = True
        ordering = ['-created_at']


from django.conf import settings

class Notification(UUIDModel, TimeStampedModel):
    """
    Store student/instructor in-app notifications.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50) # e.g. QUIZ_AVAILABLE, ASSIGNMENT_GRADED, etc.
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification ({self.notification_type}) for {self.user.email}: {self.title}"

