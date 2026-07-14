from typing import List, Dict, Any, Optional
import datetime
from django.utils import timezone
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.db.models import Sum
from apps.core.exceptions import ValidationException, NotFoundException, AuthorizationException
from apps.courses.models import Course
from apps.curriculum.models import Lesson
from .models import Enrollment, UserProgress, WatchHistory, Bookmark
from .repositories import EnrollmentRepository, UserProgressRepository, WatchHistoryRepository, BookmarkRepository

User = get_user_model()


class EnrollmentService:
    """
    Service coordinating course registrations/enrollments.
    """

    def __init__(self, enrollment_repo=None):
        self.enrollment_repo = enrollment_repo or EnrollmentRepository()

    def enroll_student(self, student: User, course_id: Any) -> Enrollment:
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise NotFoundException("Course not found.")

        if course.status != Course.Status.PUBLISHED:
            raise ValidationException("Cannot enroll in an unpublished course.")

        enrollment = self.enrollment_repo.get_by_student_and_course(student.id, course_id)
        if enrollment:
            raise ValidationException("You are already enrolled in this course.")

        # Fallback to create or retrieve deactivated enrollment
        enrollment = Enrollment.objects.filter(student=student, course=course).first()
        if enrollment:
            enrollment.is_active = True
            enrollment.unregistered_at = None
            enrollment.save()
        else:
            enrollment = self.enrollment_repo.create(student=student, course=course, is_active=True)

        return enrollment

    def unenroll_student(self, student: User, course_id: Any) -> Enrollment:
        enrollment = self.enrollment_repo.get_by_student_and_course(student.id, course_id)
        if not enrollment:
            raise NotFoundException("Active enrollment not found for this course.")

        enrollment.is_active = False
        enrollment.unregistered_at = timezone.now()
        enrollment.save()
        return enrollment

    def resume_student(self, student: User, course_id: Any) -> Enrollment:
        enrollment = Enrollment.objects.filter(student=student, course_id=course_id).first()
        if not enrollment:
            raise NotFoundException("Enrollment record not found.")

        enrollment.is_active = True
        enrollment.unregistered_at = None
        enrollment.save()
        return enrollment

    def get_enrollment_history(self, student: User) -> List[Enrollment]:
        return list(Enrollment.objects.filter(student=student).select_related("course"))

    def get_enrolled_courses(self, student: User) -> List[Course]:
        enrollments = self.enrollment_repo.get_student_enrollments(student.id)
        return [e.course for e in enrollments]

    def is_enrolled(self, student_id: Any, course_id: Any) -> bool:
        return self.enrollment_repo.filter(student_id=student_id, course_id=course_id, is_active=True).exists()


class LearningProgressService:
    """
    Service coordinating lesson completion logs and playback watch histories.
    """

    def __init__(self, enrollment_service=None, progress_repo=None, watch_repo=None, bookmark_repo=None):
        self.enrollment_service = enrollment_service or EnrollmentService()
        self.progress_repo = progress_repo or UserProgressRepository()
        self.watch_repo = watch_repo or WatchHistoryRepository()
        self.bookmark_repo = bookmark_repo or BookmarkRepository()

    def _verify_enrollment(self, student: User, course_id: Any) -> None:
        if not self.enrollment_service.is_enrolled(student.id, course_id):
            raise AuthorizationException("You must be actively enrolled in this course to track progress details.")

    def toggle_lesson_completion(self, student: User, lesson_id: Any, is_completed: bool) -> UserProgress:
        try:
            lesson = Lesson.objects.select_related("section").get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFoundException("Lesson not found.")

        course_id = lesson.section.course_id
        self._verify_enrollment(student, course_id)

        progress = self.progress_repo.get_by_student_and_lesson(student.id, lesson_id)
        if not progress:
            progress = self.progress_repo.create(
                student=student,
                course_id=course_id,
                lesson=lesson,
                is_completed=is_completed,
                completed_at=timezone.now() if is_completed else None,
            )
        else:
            progress.is_completed = is_completed
            progress.completed_at = timezone.now() if is_completed else None
            progress.save()

        # Check and update enrollment-level completion
        self.check_and_update_course_completion(student, course_id)

        return progress

    def check_and_update_course_completion(self, student: User, course_id: Any) -> None:
        enrollment = self.enrollment_service.enrollment_repo.get_by_student_and_course(student.id, course_id)
        if not enrollment:
            return

        stats = self.get_course_progress_stats(student, course_id)
        if stats["total_count"] > 0 and stats["completed_count"] == stats["total_count"]:
            if not enrollment.completed_at:
                enrollment.completed_at = timezone.now()
                enrollment.save()
                # Trigger Course Completed Signal Event!
                from apps.core import events

                events.course_completed.send(sender=LearningProgressService, student=student, course=enrollment.course)
        else:
            if enrollment.completed_at:
                enrollment.completed_at = None
                enrollment.save()

    def save_watch_position(
        self, student: User, lesson_id: Any, seconds: int, device: str = "Web Browser", watch_time: int = 0
    ) -> WatchHistory:
        try:
            lesson = Lesson.objects.select_related("section").get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFoundException("Lesson not found.")

        course_id = lesson.section.course_id
        self._verify_enrollment(student, course_id)

        # Calculate completion percentage
        lesson_duration_seconds = lesson.duration * 60
        percent = 0.0
        if lesson_duration_seconds > 0:
            percent = min((seconds / lesson_duration_seconds) * 100, 100.0)

        history = self.watch_repo.get_by_student_and_lesson(student.id, lesson_id)
        if not history:
            history = self.watch_repo.create(
                student=student,
                lesson=lesson,
                last_position=seconds,
                completion_percentage=percent,
                device=device,
                watch_time=watch_time,
            )
        else:
            history.last_position = seconds
            history.completion_percentage = percent
            history.device = device
            history.watch_time += watch_time
            history.save()

        # Modern UX auto-completion rule: if watched > 90%, automatically toggle complete!
        if percent >= 90.0:
            self.toggle_lesson_completion(student, lesson_id, is_completed=True)

        return history

    def toggle_bookmark(self, student: User, lesson_id: Any) -> bool:
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise NotFoundException("Lesson not found.")

        bookmark = self.bookmark_repo.get_by_student_and_lesson(student.id, lesson_id)
        if bookmark:
            bookmark.delete()
            return False  # Bookmarked status is now False

        self.bookmark_repo.create(student=student, lesson=lesson)
        return True  # Bookmarked status is now True

    def get_learning_statistics(self, student: User) -> Dict[str, Any]:
        # 1. Total watch time
        total_seconds = self.watch_repo.filter(student=student).aggregate(Sum("watch_time"))["watch_time__sum"] or 0
        hours_watched = round(total_seconds / 3600, 1)

        # 2. Lessons completed
        lessons_completed = self.progress_repo.filter(student=student, is_completed=True).count()

        # 3. Courses completed
        courses_completed = self.enrollment_service.enrollment_repo.filter(
            student=student, completed_at__isnull=False
        ).count()

        # 4. Weekly activity
        today = timezone.now().date()
        weekly_activity = []
        days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        monday = today - datetime.timedelta(days=today.weekday())

        for i in range(7):
            day_date = monday + datetime.timedelta(days=i)
            day_seconds = (
                self.watch_repo.filter(student=student, updated_at__date=day_date).aggregate(Sum("watch_time"))[
                    "watch_time__sum"
                ]
                or 0
            )

            weekly_activity.append({"day": days_of_week[i], "minutes": round(day_seconds / 60, 1)})

        # 5. Average daily learning (in minutes)
        first_enrollment = (
            self.enrollment_service.enrollment_repo.filter(student=student).order_by("created_at").first()
        )
        active_days = 1
        if first_enrollment:
            delta = timezone.now() - first_enrollment.created_at
            active_days = max(delta.days, 1)

        avg_daily_minutes = round((total_seconds / 60) / active_days, 1)

        return {
            "hours_watched": hours_watched,
            "lessons_completed": lessons_completed,
            "courses_completed": courses_completed,
            "avg_daily_learning": avg_daily_minutes,
            "weekly_activity": weekly_activity,
        }

    def get_course_progress_stats(self, student: User, course_id: Any) -> Dict[str, Any]:
        published_lessons = Lesson.objects.filter(section__course_id=course_id, status=Lesson.Status.PUBLISHED)
        total_lessons_count = published_lessons.count()

        if total_lessons_count == 0:
            return {"completed_count": 0, "total_count": 0, "percentage": 0.0}

        completed_lessons_count = self.progress_repo.filter(
            student=student, course_id=course_id, is_completed=True, lesson__status=Lesson.Status.PUBLISHED
        ).count()

        percentage = round((completed_lessons_count / total_lessons_count) * 100, 1)

        return {
            "completed_count": completed_lessons_count,
            "total_count": total_lessons_count,
            "percentage": percentage,
        }

    def get_recently_watched_courses(self, student: User, limit: int = 3) -> List[Dict[str, Any]]:
        histories = (
            self.watch_repo.filter(student=student).select_related("lesson__section__course").order_by("-updated_at")
        )

        recent_courses = []
        seen_course_ids = set()

        for history in histories:
            course = history.lesson.section.course
            if course.id not in seen_course_ids:
                seen_course_ids.add(course.id)
                progress_stats = self.get_course_progress_stats(student, course.id)

                recent_courses.append(
                    {
                        "course_id": str(course.id),
                        "title": course.title,
                        "slug": course.slug,
                        "thumbnail": course.thumbnail.url if course.thumbnail else None,
                        "progress_percent": progress_stats["percentage"],
                        "last_lesson_title": history.lesson.title,
                        "last_watched_at": history.updated_at,
                    }
                )

                if len(recent_courses) >= limit:
                    break

        return recent_courses
