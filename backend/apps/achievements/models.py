from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel, UUIDModel


class Badge(BaseBusinessModel):
    class BadgeType(models.TextChoices):
        FIRST_COURSE = "FIRST_COURSE", "First Course Completed"
        STREAK_7 = "STREAK_7", "7-Day Learning Streak"
        QUIZ_MASTER = "QUIZ_MASTER", "Quiz Master"
        ASSIGNMENT_CHAMPION = "ASSIGNMENT_CHAMPION", "Assignment Champion"
        TOP_PERFORMER = "TOP_PERFORMER", "Top Performer"

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="Trophy", help_text="Lucide-react icon name")
    badge_type = models.CharField(max_length=50, choices=BadgeType.choices, unique=True)

    def __str__(self):
        return f"Badge: {self.name} ({self.badge_type})"


class UserAchievement(UUIDModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="unlocks")
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "badge")
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"{self.student.email} unlocked {self.badge.name}"
