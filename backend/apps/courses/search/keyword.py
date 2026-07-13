from django.db.models import Q
from apps.courses.models import Course
from apps.curriculum.models import Lesson
from apps.discussions.models import DiscussionThread
from apps.authentication.models import User
from .base import BaseSearchEngine

class DatabaseKeywordSearchEngine(BaseSearchEngine):
    """
    Keyword Search Engine implementation performing database Q-object filters.
    """
    def search(self, query: str, user=None, **kwargs) -> dict:
        if not query:
            return {'courses': [], 'lessons': [], 'discussions': [], 'instructors': []}

        # 1. Search Courses
        courses = Course.objects.filter(
            Q(title__icontains=query) | Q(short_description__icontains=query),
            status=Course.Status.PUBLISHED
        )[:10]

        # 2. Search Lessons
        lessons_qs = Lesson.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query),
            status=Lesson.Status.PUBLISHED
        )

        # 3. Search Discussions
        discussions_qs = DiscussionThread.objects.filter(
            Q(title__icontains=query) | Q(content__icontains=query)
        )

        # Apply visibility constraints based on user context
        if not user or user.is_anonymous:
            lessons_qs = lessons_qs.none()
            discussions_qs = discussions_qs.none()
        elif user.role != 'ADMIN' and not user.is_superuser:
            lessons_qs = lessons_qs.filter(
                Q(section__course__enrollments__student=user, section__course__enrollments__is_active=True) |
                Q(section__course__instructor=user)
            ).distinct()
            discussions_qs = discussions_qs.filter(
                Q(course__enrollments__student=user, course__enrollments__is_active=True) |
                Q(course__instructor=user)
            ).distinct()

        # 4. Search Instructors
        instructors = User.objects.filter(
            Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query),
            role='INSTRUCTOR'
        )[:10]

        return {
            'courses': list(courses),
            'lessons': list(lessons_qs[:10]),
            'discussions': list(discussions_qs[:10]),
            'instructors': list(instructors)
        }
