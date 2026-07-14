import uuid
from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel


class ConversationMemory(BaseBusinessModel):
    """
    Saves conversation state and recent memory logs for student/tutor chat.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_conversations")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="ai_conversations")
    session_id = models.UUIDField(default=uuid.uuid4, unique=True)
    history = models.JSONField(default=list, blank=True, help_text="List of message objects with role/content")
    preferences = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Chat Session {self.session_id} - Student {self.student.username}"


class TokenUsage(BaseBusinessModel):
    """
    Tracks LLM prompt and completion token counts to calculate estimated usage costs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_token_usages")
    course = models.ForeignKey(
        "courses.Course", on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_token_usages"
    )
    feature_name = models.CharField(max_length=100, default="ai_tutor")
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=6, default=0.000000)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.feature_name} - {self.total_tokens} tokens"


class AICache(BaseBusinessModel):
    """
    Saves frequently generated LLM responses (e.g. lesson summaries, flashcards) to reduce API consumption costs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cache_key = models.CharField(max_length=255, unique=True)
    response_text = models.TextField(blank=True, default="")
    response_json = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Cache {self.cache_key}"


class AIQuota(BaseBusinessModel):
    """
    Enforces daily rate limits and request credit caps on student AI usages.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_quota")
    daily_request_count = models.IntegerField(default=0)
    daily_token_count = models.IntegerField(default=0)
    last_reset = models.DateField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Quota for {self.student.username} - Count: {self.daily_request_count}"
