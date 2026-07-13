from django.db import models
from apps.core.models import BaseBusinessModel

class Section(BaseBusinessModel):
    """
    Syllabus section within a course (e.g. 'Getting Started', 'Advanced Concepts').
    """
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='sections'
    )
    title = models.CharField(max_length=255)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.course.title} - Section: {self.title}"


class Lesson(BaseBusinessModel):
    """
    Individual lecture lesson inside a course section.
    """
    class LessonType(models.TextChoices):
        VIDEO = 'VIDEO', 'Video'
        ARTICLE = 'ARTICLE', 'Text Article'
        PDF = 'PDF', 'PDF Document'
        RESOURCE = 'RESOURCE', 'Downloadable File'
        LINK = 'LINK', 'External Link'
        LIVE = 'LIVE', 'Live Session'
        CODING = 'CODING', 'Interactive Coding Exercise'
        QUIZ = 'QUIZ', 'Quiz'
        ASSIGNMENT = 'ASSIGNMENT', 'Assignment'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='lessons'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    
    lesson_type = models.CharField(
        max_length=20,
        choices=LessonType.choices,
        default=LessonType.VIDEO
    )
    duration = models.IntegerField(default=0, help_text="Estimated completion duration in minutes")
    
    # Content fields depending on lesson_type
    video_url = models.CharField(max_length=500, blank=True, default='')
    content_text = models.TextField(blank=True, default='', help_text="Markdown content for Text Articles")
    content_file = models.FileField(upload_to='lessons/files/', null=True, blank=True)
    external_link = models.URLField(max_length=500, blank=True, default='')

    is_preview = models.BooleanField(default=False, help_text="Toggle if this is a free preview lesson")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Lesson: {self.title} ({self.lesson_type})"


class LessonResource(BaseBusinessModel):
    """
    Downloadable attachments associated with a lesson (ZIP files, PDFs, slides, etc.).
    """
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='resources'
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='lessons/resources/')

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Resource for {self.lesson.title}: {self.title}"
