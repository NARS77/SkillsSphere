from typing import List, Optional, Any
from django.db import transaction
from django.db.models import QuerySet
from apps.core.repositories import BaseRepository
from .models import Section, Lesson, LessonResource


class SectionRepository(BaseRepository[Section]):
    """
    Repository for managing Section queries and transactional reordering operations.
    """

    def __init__(self):
        super().__init__(Section)

    def get_course_sections(self, course_id: Any) -> QuerySet:
        return self.model.objects.filter(course_id=course_id).order_by("order", "created_at")

    def reorder_sections(self, course_id: Any, section_ids: List[Any]) -> None:
        """
        Atomically updates the order index of sections in a course.
        """
        with transaction.atomic():
            for index, section_id in enumerate(section_ids):
                self.model.objects.filter(id=section_id, course_id=course_id).update(order=index)


class LessonRepository(BaseRepository[Lesson]):
    """
    Repository for managing Lesson queries and transactional reordering operations.
    """

    def __init__(self):
        super().__init__(Lesson)

    def get_section_lessons(self, section_id: Any) -> QuerySet:
        return self.model.objects.filter(section_id=section_id).order_by("order", "created_at")

    def reorder_lessons(self, section_id: Any, lesson_ids: List[Any]) -> None:
        """
        Atomically updates the order index of lessons inside a section, and updates the section itself.
        """
        with transaction.atomic():
            for index, lesson_id in enumerate(lesson_ids):
                self.model.objects.filter(id=lesson_id).update(section_id=section_id, order=index)


class LessonResourceRepository(BaseRepository[LessonResource]):
    """
    Repository for managing LessonResource attachments.
    """

    def __init__(self):
        super().__init__(LessonResource)

    def get_lesson_resources(self, lesson_id: Any) -> QuerySet:
        return self.model.objects.filter(lesson_id=lesson_id).order_by("created_at")
