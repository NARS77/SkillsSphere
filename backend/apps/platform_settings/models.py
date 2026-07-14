from django.db import models
from apps.core.models import BaseBusinessModel


class PlatformSetting(BaseBusinessModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return f"Setting {self.key}"


class FeatureFlag(BaseBusinessModel):
    key = models.CharField(max_length=100, unique=True)
    is_enabled = models.BooleanField(default=False)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return f"Flag {self.key}: {self.is_enabled}"
