from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.courses.models import Course
from apps.curriculum.models import Section, Lesson
from .models import Enrollment, UserProgress, WatchHistory

User = get_user_model()

class EnrollmentsAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor2',
            email='instructor2@skillsphere.com',
            password='Password123!',
            role=User.Role.INSTRUCTOR
        )
        self.student = User.objects.create_user(
            username='student2',
            email='student2@skillsphere.com',
            password='Password123!',
            role=User.Role.STUDENT
        )

        # Create published and draft courses
        self.published_course = Course.objects.create(
            title='Published React Course',
            instructor=self.instructor,
            status=Course.Status.PUBLISHED
        )
        self.draft_course = Course.objects.create(
            title='Draft React Course',
            instructor=self.instructor,
            status=Course.Status.DRAFT
        )

        # Add section and lesson to published course
        self.section = Section.objects.create(course=self.published_course, title='Curriculum Root', order=1)
        self.lesson = Lesson.objects.create(
            section=self.section,
            title='Lesson 1: Intro',
            duration=10,
            status=Lesson.Status.PUBLISHED
        )

        # Access tokens
        self.student_token = self.get_jwt_token(self.student)
        self.instructor_token = self.get_jwt_token(self.instructor)

    def get_jwt_token(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def set_auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_enroll_published_course_success(self):
        """Verify student can successfully enroll in a published course."""
        self.set_auth_header(self.student_token)
        url = reverse('enrollment-enroll', args=[self.published_course.id])
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Enrollment.objects.filter(student=self.student, course=self.published_course, is_active=True).exists())

    def test_enroll_draft_course_blocked(self):
        """Verify student cannot enroll in a draft course."""
        self.set_auth_header(self.student_token)
        url = reverse('enrollment-enroll', args=[self.draft_course.id])
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_toggle_lesson_completion(self):
        """Verify checking and unchecking lesson checkboxes computes correctly."""
        self.set_auth_header(self.student_token)
        
        # Enrolling first
        Enrollment.objects.create(student=self.student, course=self.published_course, is_active=True)

        url = reverse('learning-complete', args=[self.lesson.id])
        
        # Mark complete
        response = self.client.post(url, {'is_completed': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(UserProgress.objects.filter(student=self.student, lesson=self.lesson, is_completed=True).exists())

        # Check progress percentage stats
        progress_url = reverse('learning-course-progress', args=[self.published_course.id])
        stats_response = self.client.get(progress_url)
        self.assertEqual(stats_response.data['percentage'], 100.0)

    def test_save_video_watch_position(self):
        """Verify seeking and watch position updates update WatchHistory database table."""
        self.set_auth_header(self.student_token)
        Enrollment.objects.create(student=self.student, course=self.published_course, is_active=True)

        url = reverse('learning-position', args=[self.lesson.id])
        response = self.client.post(url, {'seconds': 120}, format='json') # watched 2 minutes out of 10 (20%)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        history = WatchHistory.objects.get(student=self.student, lesson=self.lesson)
        self.assertEqual(history.last_position, 120)
        self.assertEqual(history.completion_percentage, 20.0)

    def test_classroom_aggregate_details(self):
        """Verify unified classroom returns curriculum nested with completion status checks."""
        self.set_auth_header(self.student_token)
        Enrollment.objects.create(student=self.student, course=self.published_course, is_active=True)
        UserProgress.objects.create(student=self.student, course=self.published_course, lesson=self.lesson, is_completed=True)
        WatchHistory.objects.create(student=self.student, lesson=self.lesson, last_position=60, completion_percentage=10.0)

        classroom_url = reverse('learning-classroom', args=[self.published_course.slug])
        response = self.client.get(classroom_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        section_data = response.data['sections'][0]
        lesson_data = section_data['lessons'][0]
        self.assertEqual(lesson_data['is_completed'], True)
        self.assertEqual(lesson_data['last_position'], 60)

    def test_bookmark_toggles(self):
        """Verify toggling bookmark creates/removes bookmark entries."""
        self.set_auth_header(self.student_token)
        Enrollment.objects.create(student=self.student, course=self.published_course, is_active=True)

        url = reverse('learning-toggle-bookmark')
        # 1. Toggle On
        response = self.client.post(url, {'lesson_id': str(self.lesson.id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bookmarked'], True)

        # 2. List Bookmarks
        list_url = reverse('learning-list-bookmarks')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 3. Toggle Off
        response = self.client.post(url, {'lesson_id': str(self.lesson.id)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bookmarked'], False)

    def test_unenroll_and_resume(self):
        """Verify unenrollment soft deletes and resume reactivation works."""
        self.set_auth_header(self.student_token)
        enrollment = Enrollment.objects.create(student=self.student, course=self.published_course, is_active=True)

        unenroll_url = reverse('enrollment-unenroll', args=[self.published_course.id])
        response = self.client.post(unenroll_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        enrollment.refresh_from_db()
        self.assertFalse(enrollment.is_active)
        self.assertIsNotNone(enrollment.unregistered_at)

        resume_url = reverse('enrollment-resume', args=[self.published_course.id])
        response = self.client.post(resume_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        enrollment.refresh_from_db()
        self.assertTrue(enrollment.is_active)
        self.assertIsNone(enrollment.unregistered_at)
