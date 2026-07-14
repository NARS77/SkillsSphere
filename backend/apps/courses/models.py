from django.db import models
from django.utils.text import slugify
from django.conf import settings
from apps.core.models import BaseBusinessModel


class Category(BaseBusinessModel):
    """
    Categories that courses belong to (e.g., Web Development, Design, Business).
    Managed by administrators.
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    icon = models.CharField(max_length=50, help_text="Lucide icon name")
    color = models.CharField(max_length=50, default="brand", help_text="Tailwind color prefix (e.g. indigo, emerald)")
    order = models.IntegerField(default=0, help_text="Custom display sorting order")

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Course(BaseBusinessModel):
    """
    Course entity created and managed by Instructors.
    """

    class Difficulty(models.TextChoices):
        BEGINNER = "BEGINNER", "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        ARCHIVED = "ARCHIVED", "Archived"

    class Visibility(models.TextChoices):
        PUBLIC = "PUBLIC", "Public"
        PRIVATE = "PRIVATE", "Private"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    short_description = models.CharField(max_length=500)
    description = models.TextField(help_text="Detailed Markdown description of the course")
    thumbnail = models.ImageField(upload_to="courses/thumbnails/", null=True, blank=True)
    banner = models.ImageField(upload_to="courses/banners/", null=True, blank=True)

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="courses")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="instructed_courses"
    )

    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    language = models.CharField(max_length=50, default="English")
    duration = models.IntegerField(help_text="Estimated course duration in hours", default=0)

    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC, db_index=True)

    # Store lists of tags, prerequisites, and learning outcomes in database-independent JSON fields
    tags = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    learning_outcomes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            num = 1
            while Course.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug
        super().save(*args, **kwargs)


class SavedSearch(BaseBusinessModel):
    """
    Saves search queries and filters for students to run later.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_searches")
    query = models.CharField(max_length=255)
    filters = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student.username} - {self.query}"
