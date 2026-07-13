from typing import List, Optional, Any
from django.db import models
from apps.core.repositories import BaseRepository
from .models import Enrollment, UserProgress, WatchHistory, Bookmark

class EnrollmentRepository(BaseRepository[Enrollment]):
    """
    Repository for managing Enrollment database operations.
    """
    def __init__(self):
        super().__init__(Enrollment)

    def get_by_student_and_course(self, student_id: Any, course_id: Any) -> Optional[Enrollment]:
        return self.model.objects.filter(student_id=student_id, course_id=course_id, is_active=True).first()

    def get_student_enrollments(self, student_id: Any) -> models.QuerySet:
        return self.model.objects.select_related('course', 'course__category').filter(student_id=student_id, is_active=True)


class UserProgressRepository(BaseRepository[UserProgress]):
    """
    Repository for managing UserProgress database queries.
    """
    def __init__(self):
        super().__init__(UserProgress)

    def get_completed_count(self, student_id: Any, course_id: Any) -> int:
        return self.model.objects.filter(
            student_id=student_id,
            course_id=course_id,
            is_completed=True
        ).count()

    def get_by_student_and_lesson(self, student_id: Any, lesson_id: Any) -> Optional[UserProgress]:
        return self.model.objects.filter(student_id=student_id, lesson_id=lesson_id).first()


class WatchHistoryRepository(BaseRepository[WatchHistory]):
    """
    Repository for managing WatchHistory database operations.
    """
    def __init__(self):
        super().__init__(WatchHistory)

    def get_by_student_and_lesson(self, student_id: Any, lesson_id: Any) -> Optional[WatchHistory]:
        return self.model.objects.filter(student_id=student_id, lesson_id=lesson_id).first()


class BookmarkRepository(BaseRepository[Bookmark]):
    """
    Repository for managing Bookmark queries.
    """
    def __init__(self):
        super().__init__(Bookmark)

    def get_student_bookmarks(self, student_id: Any) -> models.QuerySet:
        return self.model.objects.select_related('lesson', 'lesson__section', 'lesson__section__course').filter(student_id=student_id)

    def get_by_student_and_lesson(self, student_id: Any, lesson_id: Any) -> Optional[Bookmark]:
        return self.model.objects.filter(student_id=student_id, lesson_id=lesson_id).first()
