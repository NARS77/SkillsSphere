from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel


class AuditLog(BaseBusinessModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        actor_name = self.actor.username if self.actor else "System"
        return f"[{self.timestamp}] {actor_name} performed {self.action}"
