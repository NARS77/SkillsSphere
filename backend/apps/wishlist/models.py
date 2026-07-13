from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class WishlistItem(BaseBusinessModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='wishlisted_by'
    )

    class Meta:
        ordering = ['-created_at']
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} wishlisted {self.course.title}"
