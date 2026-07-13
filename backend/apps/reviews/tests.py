from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.courses.models import Course, Category
from apps.enrollments.models import Enrollment, UserProgress
from apps.curriculum.models import Section, Lesson
from apps.core.exceptions import ValidationException
from .models import Review, ReviewReply, ReviewHelpful, ReviewReport
from .services import ReviewService

User = get_user_model()

class ReviewsServiceTestCase(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='password123',
            role=User.Role.STUDENT
        )
        self.instructor = User.objects.create_user(
            username='instructor1',
            email='instructor1@test.com',
            password='password123',
            role=User.Role.INSTRUCTOR
        )
        
        self.category = Category.objects.create(name='Programming', icon='code', color='indigo')
        self.course = Course.objects.create(
            title='Python Basics',
            short_description='Learn Python',
            description='Detailed course desc',
            instructor=self.instructor,
            category=self.category,
            price=99.99
        )
        self.section = Section.objects.create(course=self.course, title='Intro', order=0)
        self.lesson1 = Lesson.objects.create(
            section=self.section,
            title='Hello World',
            lesson_type=Lesson.LessonType.VIDEO,
            order=0,
            status=Lesson.Status.PUBLISHED
        )
        self.lesson2 = Lesson.objects.create(
            section=self.section,
            title='Variables',
            lesson_type=Lesson.LessonType.VIDEO,
            order=1,
            status=Lesson.Status.PUBLISHED
        )

    def test_submit_review_without_enrollment(self):
        with self.assertRaises(ValidationException) as context:
            ReviewService.submit_review(self.student, self.course.id, 5, "Great course")
        self.assertIn("must be enrolled", str(context.exception))

    def test_submit_review_with_low_progress(self):
        # Enroll but no lessons completed (0% progress)
        Enrollment.objects.create(student=self.student, course=self.course, is_active=True)
        with self.assertRaises(ValidationException) as context:
            ReviewService.submit_review(self.student, self.course.id, 5, "Great course")
        self.assertIn("completion to submit a review", str(context.exception))

    def test_submit_review_with_valid_progress(self):
        # Enroll and complete 1 of 2 lessons (50% progress, which is >= 30%)
        Enrollment.objects.create(student=self.student, course=self.course, is_active=True)
        UserProgress.objects.create(student=self.student, course=self.course, lesson=self.lesson1, is_completed=True)
        
        review = ReviewService.submit_review(self.student, self.course.id, 4, "Really good!")
        self.assertEqual(review.rating, 4)
        self.assertEqual(review.content, "Really good!")

    def test_helpful_vote_toggle(self):
        Enrollment.objects.create(student=self.student, course=self.course, is_active=True)
        UserProgress.objects.create(student=self.student, course=self.course, lesson=self.lesson1, is_completed=True)
        review = ReviewService.submit_review(self.student, self.course.id, 5, "Nice")
        
        voted = ReviewService.toggle_helpful(self.student, review.id)
        self.assertTrue(voted)
        self.assertEqual(ReviewHelpful.objects.filter(review=review, user=self.student).count(), 1)
        
        # Toggle off
        voted = ReviewService.toggle_helpful(self.student, review.id)
        self.assertFalse(voted)
        self.assertEqual(ReviewHelpful.objects.filter(review=review, user=self.student).count(), 0)

    def test_instructor_reply_permissions(self):
        Enrollment.objects.create(student=self.student, course=self.course, is_active=True)
        UserProgress.objects.create(student=self.student, course=self.course, lesson=self.lesson1, is_completed=True)
        review = ReviewService.submit_review(self.student, self.course.id, 5, "Nice")

        # Other user replies -> should fail
        other_user = User.objects.create_user(username='other', email='other@test.com', password='password')
        with self.assertRaises(ValidationException):
            ReviewService.reply_to_review(other_user, review.id, "Thanks")

        # Course instructor replies -> should succeed
        reply = ReviewService.reply_to_review(self.instructor, review.id, "Thank you for the review!")
        self.assertEqual(reply.content, "Thank you for the review!")
