from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel


class Enrollment(BaseBusinessModel):
    """
    Tracks course registrations/enrollments by students.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="enrollments")
    is_active = models.BooleanField(default=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    unregistered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.email} enrolled in {self.course.title}"


class UserProgress(BaseBusinessModel):
    """
    Logs lesson completion records to track course progress metrics.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="progress_records")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="progress_records")
    lesson = models.ForeignKey("curriculum.Lesson", on_delete=models.CASCADE, related_name="progress_records")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("student", "lesson")

    def __str__(self):
        status = "Completed" if self.is_completed else "Incomplete"
        return f"{self.student.username} - {self.lesson.title} : {status}"


class WatchHistory(BaseBusinessModel):
    """
    Persists play positioning timestamps for video lessons.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watch_histories")
    lesson = models.ForeignKey("curriculum.Lesson", on_delete=models.CASCADE, related_name="watch_histories")
    last_position = models.IntegerField(default=0, help_text="Watch position in seconds")
    completion_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.0, help_text="Watch completion percentage (0.0 to 100.0)"
    )
    device = models.CharField(max_length=100, default="Web Browser")
    watch_time = models.IntegerField(default=0, help_text="Total watch time in seconds")

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("student", "lesson")

    def __str__(self):
        return f"{self.student.username} watched {self.lesson.title} at {self.last_position}s"


class Bookmark(BaseBusinessModel):
    """
    Saves student bookmarks on specific course lessons.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks")
    lesson = models.ForeignKey("curriculum.Lesson", on_delete=models.CASCADE, related_name="bookmarks")

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("student", "lesson")

    def __str__(self):
        return f"{self.student.username} bookmarked {self.lesson.title}"
