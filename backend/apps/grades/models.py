from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class GradebookEntry(BaseBusinessModel):
    enrollment = models.OneToOneField(
        'enrollments.Enrollment',
        on_delete=models.CASCADE,
        related_name='gradebook_entry'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gradebook_entries'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='gradebook_entries'
    )
    
    quiz_average = models.DecimalField(max_digits=5, decimal_places=2, default=0.0, help_text="Average score percentage of all quizzes")
    assignment_average = models.DecimalField(max_digits=5, decimal_places=2, default=0.0, help_text="Average score percentage of all assignments")
    
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0, help_text="Weighted overall percentage score")
    grade_letter = models.CharField(max_length=5, default='F')
    passed = models.BooleanField(default=False)

    def __str__(self):
        return f"Gradebook Entry for {self.student.email} in {self.course.title}: {self.grade_letter} ({self.overall_score}%)"
