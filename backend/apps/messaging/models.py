from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel


class Conversation(BaseBusinessModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_conversations"
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="instructor_conversations"
    )
    is_archived_by_student = models.BooleanField(default=False)
    is_archived_by_instructor = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("student", "instructor")

    def __str__(self):
        return f"Chat: {self.student.username} <-> {self.instructor.username}"


class Message(BaseBusinessModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField()
    attachment = models.FileField(upload_to="chat/attachments/", null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message by {self.sender.username} at {self.created_at}"
