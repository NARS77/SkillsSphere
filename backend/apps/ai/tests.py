from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from apps.courses.models import Course, Category
from apps.curriculum.models import Section, Lesson
from apps.ai.models import TokenUsage, AIQuota, AICache

User = get_user_model()

class AITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='student@example.com',
            username='student',
            password='Password123!',
            role='STUDENT'
        )
        self.client.force_authenticate(user=self.user)
        
        # Setup instructor user
        self.instructor = User.objects.create_user(
            email='instructor@example.com',
            username='instructor',
            password='Password123!',
            role='INSTRUCTOR'
        )
        
        # Setup course and curriculum
        self.category = Category.objects.create(name='Technology')
        self.course = Course.objects.create(
            title='Intro to AI',
            slug='intro-to-ai',
            price=29.99,
            category=self.category,
            status=Course.Status.PUBLISHED,
            instructor=self.instructor
        )
        self.section = Section.objects.create(course=self.course, title='Section 1')
        self.lesson = Lesson.objects.create(
            section=self.section,
            title='What is an LLM?',
            description='Learn about LLMs and Transformers',
            content_text='Transformers are modular models using self-attention.'
        )

    def test_study_planner_generation(self):
        url = reverse('ai-study-planner')
        data = {'target_hours': 10, 'completion_date': '2026-10-31'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('schedule', response.data)
        self.assertEqual(response.data['weekly_hours'], 10)

    def test_recommendations_retrieval(self):
        url = reverse('ai-recommendations')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) > 0)

    def test_quota_verification(self):
        quota, created = AIQuota.objects.get_or_create(student=self.user)
        quota.daily_request_count = 1000  # Set way above daily limit
        quota.save()

        url = reverse('ai-study-planner')
        data = {'target_hours': 5, 'completion_date': '2026-12-31'}
        response = self.client.post(url, data, format='json')
        # Should raise ValidationException (status 400) due to exceeded quota
        self.assertEqual(response.status_code, 400)
