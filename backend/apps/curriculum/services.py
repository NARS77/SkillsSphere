from typing import List, Dict, Any, Optional
from django.db.models import Max
from django.contrib.auth import get_user_model
from apps.core.exceptions import ValidationException, NotFoundException, AuthorizationException
from apps.courses.models import Course
from .models import Section, Lesson, LessonResource
from .repositories import SectionRepository, LessonRepository, LessonResourceRepository

User = get_user_model()


class CurriculumService:
    """
    Service coordinating CRUD, reordering, duplicating and resource management for course curricula.
    """

    def __init__(self):
        self.section_repo = SectionRepository()
        self.lesson_repo = LessonRepository()
        self.resource_repo = LessonResourceRepository()

    def _verify_course_ownership(self, course_id: Any, user: User) -> None:
        """
        Raises AuthorizationException if the user is not the instructor of the course
        and is not an administrator.
        """
        if user.is_superuser or user.role == "ADMIN":
            return

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise NotFoundException("Associated course not found.")

        if course.instructor_id != user.id:
            raise AuthorizationException("You do not have permission to modify this course curriculum.")

    def _verify_section_ownership(self, section: Section, user: User) -> None:
        self._verify_course_ownership(section.course_id, user)

    def _verify_lesson_ownership(self, lesson: Lesson, user: User) -> None:
        self._verify_course_ownership(lesson.section.course.id, user)

    def _verify_resource_ownership(self, resource: LessonResource, user: User) -> None:
        self._verify_course_ownership(resource.lesson.section.course.id, user)

    # --- Section Services ---

    def create_section(self, course_id: Any, title: str, user: User) -> Section:
        self._verify_course_ownership(course_id, user)

        # Calculate next order index
        max_order = self.section_repo.get_course_sections(course_id).aggregate(Max("order"))["order__max"]
        next_order = (max_order or 0) + 1

        return self.section_repo.create(course_id=course_id, title=title, order=next_order)

    def update_section(self, section_id: Any, title: str, user: User) -> Section:
        section = self.section_repo.get_by_id(section_id)
        if not section:
            raise NotFoundException("Section not found.")

        self._verify_section_ownership(section, user)
        return self.section_repo.update(section, title=title)

    def delete_section(self, section_id: Any, user: User) -> None:
        section = self.section_repo.get_by_id(section_id)
        if not section:
            raise NotFoundException("Section not found.")

        self._verify_section_ownership(section, user)
        self.section_repo.delete(section)

    def reorder_sections(self, course_id: Any, section_ids: List[Any], user: User) -> None:
        self._verify_course_ownership(course_id, user)
        self.section_repo.reorder_sections(course_id, section_ids)

    # --- Lesson Services ---

    def create_lesson(self, section_id: Any, data: Dict[str, Any], user: User) -> Lesson:
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            raise NotFoundException("Section not found.")

        self._verify_section_ownership(section, user)

        # Calculate next order index
        max_order = self.lesson_repo.get_section_lessons(section_id).aggregate(Max("order"))["order__max"]
        next_order = (max_order or 0) + 1

        status_val = data.pop("status", Lesson.Status.DRAFT)
        lesson = self.lesson_repo.model(section=section, order=next_order, status=status_val, **data)
        self.lesson_repo.save(lesson)
        if lesson.lesson_type == Lesson.LessonType.VIDEO and lesson.content_file:
            from .tasks import process_video_task

            process_video_task.delay(lesson.id)
        return lesson

    def update_lesson(self, lesson_id: Any, data: Dict[str, Any], user: User) -> Lesson:
        lesson = self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise NotFoundException("Lesson not found.")

        self._verify_lesson_ownership(lesson, user)

        for field, value in data.items():
            setattr(lesson, field, value)

        self.lesson_repo.save(lesson)
        if lesson.lesson_type == Lesson.LessonType.VIDEO and lesson.content_file:
            from .tasks import process_video_task

            process_video_task.delay(lesson.id)
        return lesson

    def delete_lesson(self, lesson_id: Any, user: User) -> None:
        lesson = self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise NotFoundException("Lesson not found.")

        self._verify_lesson_ownership(lesson, user)
        self.lesson_repo.delete(lesson)

    def duplicate_lesson(self, lesson_id: Any, user: User) -> Lesson:
        lesson = self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise NotFoundException("Lesson not found.")

        self._verify_lesson_ownership(lesson, user)

        # Calculate next order index
        max_order = self.lesson_repo.get_section_lessons(lesson.section_id).aggregate(Max("order"))["order__max"]
        next_order = (max_order or 0) + 1

        duplicated_lesson = Lesson(
            section=lesson.section,
            title=f"Copy of {lesson.title}",
            description=lesson.description,
            lesson_type=lesson.lesson_type,
            duration=lesson.duration,
            video_url=lesson.video_url,
            content_text=lesson.content_text,
            content_file=lesson.content_file,
            external_link=lesson.external_link,
            is_preview=lesson.is_preview,
            status=Lesson.Status.DRAFT,
            order=next_order,
        )
        self.lesson_repo.save(duplicated_lesson)
        return duplicated_lesson

    def reorder_lessons(self, section_id: Any, lesson_ids: List[Any], user: User) -> None:
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            raise NotFoundException("Section not found.")

        self._verify_section_ownership(section, user)
        self.lesson_repo.reorder_lessons(section_id, lesson_ids)

    # --- Resource Services ---

    def create_resource(self, lesson_id: Any, title: str, file_obj: Any, user: User) -> LessonResource:
        lesson = self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise NotFoundException("Lesson not found.")

        self._verify_lesson_ownership(lesson, user)

        return self.resource_repo.create(lesson=lesson, title=title, file=file_obj)

    def delete_resource(self, resource_id: Any, user: User) -> None:
        resource = self.resource_repo.get_by_id(resource_id)
        if not resource:
            raise NotFoundException("Resource not found.")

        self._verify_resource_ownership(resource, user)
        self.resource_repo.delete(resource)
