from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class Assignment(BaseBusinessModel):
    class LateRules(models.TextChoices):
        ALLOWED = 'ALLOWED', 'Allow late submissions'
        DENIED = 'DENIED', 'Deny late submissions'
        PENALIZED = 'PENALIZED', 'Penalize late submissions'

    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    lesson = models.OneToOneField(
        'curriculum.Lesson',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assignment'
    )
    title = models.CharField(max_length=255)
    instructions = models.TextField()
    due_date = models.DateTimeField()
    max_score = models.IntegerField(default=100)
    rubric = models.JSONField(null=True, blank=True, help_text="List of rubric criteria, e.g. [{'criteria': 'Code Quality', 'points': 50}]")
    late_submission_rule = models.CharField(
        max_length=20,
        choices=LateRules.choices,
        default=LateRules.ALLOWED
    )
    late_penalty_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0, help_text="Percentage deducted per day late")

    def __str__(self):
        return f"Assignment: {self.title}"


class AssignmentSubmission(BaseBusinessModel):
    class Status(models.TextChoices):
        SUBMITTED = 'SUBMITTED', 'Submitted'
        GRADED = 'GRADED', 'Graded'
        RESUBMISSION_REQUIRED = 'RESUBMISSION_REQUIRED', 'Resubmission Required'

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assignment_submissions'
    )
    file = models.FileField(upload_to='assignments/submissions/', null=True, blank=True)
    github_repo_url = models.URLField(blank=True, default='')
    text_submission = models.TextField(blank=True, default='')
    
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.SUBMITTED
    )
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True, default='')
    rubric_scoring = models.JSONField(null=True, blank=True, help_text="Dict mapping criteria description to awarded points")
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='graded_assignment_submissions'
    )

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Submission by {self.student.email} on {self.assignment.title} ({self.status})"
