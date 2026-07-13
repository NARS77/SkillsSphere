from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.courses.models import Course
from .models import Section, Lesson

User = get_user_model()

class CurriculumAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor1',
            email='instructor1@skillsphere.com',
            password='Password123!',
            role=User.Role.INSTRUCTOR
        )
        self.student = User.objects.create_user(
            username='student1',
            email='student1@skillsphere.com',
            password='Password123!',
            role=User.Role.STUDENT
        )

        # Create course
        self.course = Course.objects.create(
            title='React Advanced',
            instructor=self.instructor,
            status=Course.Status.DRAFT
        )

        # API URLs
        self.section_list_url = reverse('section-list')
        self.lesson_list_url = reverse('lesson-list')

        # Authentication tokens
        self.instructor_token = self.get_jwt_token(self.instructor)
        self.student_token = self.get_jwt_token(self.student)

    def get_jwt_token(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def set_auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_instructor_can_create_section(self):
        """Verify instructors can add sections to their course curriculum."""
        self.set_auth_header(self.instructor_token)
        data = {
            'course_id': str(self.course.id),
            'title': 'Chapter 1: Getting Started'
        }
        response = self.client.post(self.section_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], data['title'])
        self.assertEqual(response.data['order'], 1)

    def test_student_blocked_from_curriculum_management(self):
        """Verify students are blocked from making curriculum alterations (RBAC)."""
        self.set_auth_header(self.student_token)
        data = {
            'course_id': str(self.course.id),
            'title': 'Hacked Section'
        }
        response = self.client.post(self.section_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reorder_sections_success(self):
        """Verify atomic section reordering shifts database order indexes correctly."""
        self.set_auth_header(self.instructor_token)
        s1 = Section.objects.create(course=self.course, title='Section 1', order=1)
        s2 = Section.objects.create(course=self.course, title='Section 2', order=2)

        reorder_url = reverse('section-reorder')
        data = {
            'course_id': str(self.course.id),
            'section_ids': [str(s2.id), str(s1.id)] # Invert order
        }
        response = self.client.post(reorder_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh from database and verify indices inverted
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertEqual(s2.order, 0)
        self.assertEqual(s1.order, 1)

    def test_instructor_create_lesson_and_duplicate(self):
        """Verify lesson creations and duplicates cloning behaves correctly."""
        self.set_auth_header(self.instructor_token)
        section = Section.objects.create(course=self.course, title='Intro Section', order=1)

        lesson_data = {
            'section_id': str(section.id),
            'title': 'React State Hooks',
            'description': 'Comprehensive details on useState',
            'lesson_type': 'VIDEO',
            'duration': 15,
            'video_url': 'http://example.com/video.mp4'
        }

        # 1. Create Lesson
        response = self.client.post(self.lesson_list_url, lesson_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lesson_id = response.data['id']

        # 2. Duplicate Lesson
        dup_url = reverse('lesson-duplicate', args=[lesson_id])
        response = self.client.post(dup_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Copy of React State Hooks')
        self.assertEqual(response.data['status'], 'DRAFT')
        self.assertEqual(response.data['order'], 2)

    def test_reorder_lessons_cross_sections(self):
        """Verify lessons can be reordered/moved across sections successfully."""
        self.set_auth_header(self.instructor_token)
        sec1 = Section.objects.create(course=self.course, title='Section 1', order=1)
        sec2 = Section.objects.create(course=self.course, title='Section 2', order=2)

        lesson1 = Lesson.objects.create(
            section=sec1, title='Lesson 1', order=1, duration=10, status=Lesson.Status.PUBLISHED
        )
        Lesson.objects.create(
            section=sec1, title='Lesson 2', order=2, duration=10, status=Lesson.Status.PUBLISHED
        )

        reorder_url = reverse('lesson-reorder')
        
        # Move lesson1 to sec2
        data = {
            'section_id': str(sec2.id),
            'lesson_ids': [str(lesson1.id)]
        }
        response = self.client.post(reorder_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        lesson1.refresh_from_db()
        self.assertEqual(lesson1.section_id, sec2.id)
        self.assertEqual(lesson1.order, 0)
