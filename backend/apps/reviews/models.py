from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class Review(BaseBusinessModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.IntegerField(help_text="Rating from 1 to 5 stars")
    content = models.TextField(blank=True, default='')
    is_pinned = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    reported_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        unique_together = ('student', 'course')

    def __str__(self):
        return f"Review by {self.student.username} on {self.course.title} ({self.rating} stars)"


class ReviewReply(BaseBusinessModel):
    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name='reply'
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review_replies'
    )
    content = models.TextField()

    def __str__(self):
        return f"Reply by {self.instructor.username} to review {self.review.id}"


class ReviewHelpful(BaseBusinessModel):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='helpful_votes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='helpful_reviews'
    )

    class Meta:
        unique_together = ('review', 'user')


class ReviewReport(BaseBusinessModel):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reported_reviews'
    )
    reason = models.TextField()

    class Meta:
        unique_together = ('review', 'user')
