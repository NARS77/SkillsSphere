from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from apps.enrollments.models import Enrollment, UserProgress
from apps.curriculum.models import Lesson
from apps.core.models import Notification
from .models import Review, ReviewReply, ReviewHelpful, ReviewReport


class ReviewService:
    @staticmethod
    def get_student_progress(student, course):
        total = Lesson.objects.filter(section__course=course, status=Lesson.Status.PUBLISHED).count()
        if total == 0:
            return 100.0
        completed = UserProgress.objects.filter(
            student=student, lesson__section__course=course, is_completed=True, lesson__status=Lesson.Status.PUBLISHED
        ).count()
        return (completed / total) * 100.0

    @classmethod
    def submit_review(cls, student, course_id, rating, content=""):
        from apps.courses.models import Course

        course = get_object_or_404(Course, id=course_id)

        # Check enrollment
        if not Enrollment.objects.filter(student=student, course=course, is_active=True).exists():
            raise ValidationException("You must be enrolled in the course to submit a review.")

        # Check progress (must be >= 30%)
        progress = cls.get_student_progress(student, course)
        if progress < 30.0:
            raise ValidationException(
                f"You have only completed {progress:.1f}% of the course. You need at least 30.0% completion to submit a review."
            )

        if rating < 1 or rating > 5:
            raise ValidationException("Rating must be between 1 and 5 stars.")

        review, created = Review.objects.update_or_create(
            student=student, course=course, defaults={"rating": rating, "content": content}
        )

        # Notify instructor
        Notification.objects.create(
            user=course.instructor,
            title="New Course Review",
            message=f"{student.username} left a {rating}-star review on {course.title}.",
            notification_type="NEW_REVIEW",
        )

        # Audit Log
        from apps.audit_logs.services import AuditLogService

        AuditLogService.log_action(student, "SUBMIT_REVIEW", {"course_id": str(course.id), "rating": rating})

        return review

    @staticmethod
    def reply_to_review(instructor, review_id, content):
        review = get_object_or_404(Review, id=review_id)
        if review.course.instructor != instructor:
            raise ValidationException("Only the course instructor can reply to this review.")

        reply, created = ReviewReply.objects.update_or_create(
            review=review, defaults={"instructor": instructor, "content": content}
        )

        # Notify student
        Notification.objects.create(
            user=review.student,
            title="Instructor Replied to Review",
            message=f"The instructor replied to your review on {review.course.title}.",
            notification_type="REVIEW_REPLY",
        )

        return reply

    @staticmethod
    def toggle_helpful(user, review_id):
        review = get_object_or_404(Review, id=review_id)
        vote_qs = ReviewHelpful.objects.filter(review=review, user=user)
        if vote_qs.exists():
            vote_qs.delete()
            return False
        else:
            ReviewHelpful.objects.create(review=review, user=user)
            return True

    @staticmethod
    def report_review(user, review_id, reason):
        review = get_object_or_404(Review, id=review_id)
        report, created = ReviewReport.objects.get_or_create(review=review, user=user, defaults={"reason": reason})
        if created:
            review.reported_count += 1
            review.save()
        return report

    @staticmethod
    def pin_review(instructor, review_id, pin_status=True):
        review = get_object_or_404(Review, id=review_id)
        if review.course.instructor != instructor:
            raise ValidationException("Only the course instructor can pin this review.")
        review.is_pinned = pin_status
        review.save()
        return review
