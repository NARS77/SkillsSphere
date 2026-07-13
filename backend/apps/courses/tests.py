from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Category, Course

User = get_user_model()

class CourseAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor1',
            email='instructor1@skillsphere.com',
            password='Password123!',
            role=User.Role.INSTRUCTOR
        )
        self.other_instructor = User.objects.create_user(
            username='instructor2',
            email='instructor2@skillsphere.com',
            password='Password123!',
            role=User.Role.INSTRUCTOR
        )
        self.student = User.objects.create_user(
            username='student1',
            email='student1@skillsphere.com',
            password='Password123!',
            role=User.Role.STUDENT
        )

        # Create category
        self.category = Category.objects.create(
            name='Web Development',
            icon='code',
            color='indigo',
            order=1
        )
        self.category2 = Category.objects.create(
            name='Data Science',
            icon='database',
            color='emerald',
            order=2
        )

        # Base URLs
        self.instructor_courses_url = reverse('instructor-course-list')
        self.catalog_url = reverse('catalog-list')
        self.category_url = reverse('category-list')

        # Generate JWT tokens for authentication
        self.instructor_token = self.get_jwt_token(self.instructor)
        self.other_instructor_token = self.get_jwt_token(self.other_instructor)
        self.student_token = self.get_jwt_token(self.student)

    def get_jwt_token(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def set_auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_student_cannot_create_course(self):
        """Verify students are blocked from creating courses (RBAC)."""
        self.set_auth_header(self.student_token)
        response = self.client.post(self.instructor_courses_url, {'title': 'Course'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_create_course_draft(self):
        """Verify instructors can initialize a course draft."""
        self.set_auth_header(self.instructor_token)
        data = {
            'title': 'React SaaS App Development',
            'short_description': 'Build commercial React web apps',
            'description': 'Long description details',
            'category_id': str(self.category.id),
            'difficulty': 'BEGINNER',
            'price': 49.99
        }
        response = self.client.post(self.instructor_courses_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'DRAFT')
        self.assertEqual(response.data['title'], data['title'])
        self.assertEqual(response.data['category']['name'], self.category.name)

    def test_price_validation_negative(self):
        """Verify system rejects negative pricing schemas."""
        self.set_auth_header(self.instructor_token)
        data = {
            'title': 'Test Course',
            'short_description': 'A short test description',
            'description': 'A detailed markdown description for this course.',
            'price': -10.00
        }
        response = self.client.post(self.instructor_courses_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', response.data['error']['details'])

    def test_price_validation_discount_greater(self):
        """Verify discount price cannot exceed base price."""
        self.set_auth_header(self.instructor_token)
        data = {
            'title': 'Test Course',
            'short_description': 'A short test description',
            'description': 'A detailed markdown description for this course.',
            'price': 100.00,
            'discount_price': 120.00
        }
        response = self.client.post(self.instructor_courses_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('discount_price', response.data['error']['details'])

    def test_publish_workflow_step_validation(self):
        """Verify publishing validation requirements (duration, outcomes, description)."""
        self.set_auth_header(self.instructor_token)
        
        # Create incomplete draft
        course = Course.objects.create(
            title='Incomplete Draft',
            short_description='Incomplete',
            description='', # Empty detailed description
            category=self.category,
            instructor=self.instructor,
            duration=0, # Duration 0
            learning_outcomes=[] # Empty outcomes
        )
        
        publish_url = reverse('instructor-course-publish', args=[course.id])
        
        # Try to publish incomplete draft
        response = self.client.post(publish_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data['error']['details'])
        self.assertIn('duration', response.data['error']['details'])
        self.assertIn('learning_outcomes', response.data['error']['details'])

        # Update draft fields to meet publication criteria
        course.description = 'Fully detailed markdown course instructions'
        course.duration = 10
        course.learning_outcomes = ['Learn React', 'Build Saas apps']
        course.save()

        # Publish again
        response = self.client.post(publish_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'PUBLISHED')

    def test_other_instructor_cannot_modify_course(self):
        """Verify instructors cannot modify other instructors' courses."""
        course = Course.objects.create(
            title='Instructor 1 Course',
            instructor=self.instructor
        )
        
        self.set_auth_header(self.other_instructor_token)
        edit_url = reverse('instructor-course-detail', args=[course.id])
        
        response = self.client.patch(edit_url, {'title': 'Hacked Title'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_course_draft(self):
        """Verify instructors can clone their courses into a new draft."""
        course = Course.objects.create(
            title='Original Course Template',
            short_description='Original description',
            instructor=self.instructor,
            category=self.category,
            price=29.99
        )
        
        self.set_auth_header(self.instructor_token)
        duplicate_url = reverse('instructor-course-duplicate', args=[course.id])
        
        response = self.client.post(duplicate_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Copy of Original Course Template')
        self.assertEqual(response.data['status'], 'DRAFT')
        
        # Verify database has two records
        self.assertEqual(Course.objects.filter(instructor=self.instructor).count(), 2)

    def test_safe_deletion_draft_only(self):
        """Verify only drafts can be permanently deleted."""
        draft_course = Course.objects.create(
            title='Draft Course',
            instructor=self.instructor,
            status=Course.Status.DRAFT
        )
        published_course = Course.objects.create(
            title='Published Course',
            instructor=self.instructor,
            status=Course.Status.PUBLISHED,
            duration=5,
            short_description='desc',
            description='desc',
            category=self.category,
            learning_outcomes=['learn']
        )
        
        self.set_auth_header(self.instructor_token)
        
        # Delete draft - should succeed
        draft_del_url = reverse('instructor-course-detail', args=[draft_course.id])
        response = self.client.delete(draft_del_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Delete published - should fail
        pub_del_url = reverse('instructor-course-detail', args=[published_course.id])
        response = self.client.delete(pub_del_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'DomainException')

    def test_catalog_search_and_filters(self):
        """Verify public catalog search, category, and difficulty filtering."""
        # Create published courses
        Course.objects.create(
            title='Intro to VueJS',
            short_description='Web development with Vue',
            instructor=self.instructor,
            category=self.category,
            difficulty=Course.Difficulty.BEGINNER,
            status=Course.Status.PUBLISHED,
            price=10.00
        )
        Course.objects.create(
            title='Advanced PyTorch',
            short_description='Deep learning frameworks',
            instructor=self.instructor,
            category=self.category2,
            difficulty=Course.Difficulty.ADVANCED,
            status=Course.Status.PUBLISHED,
            price=99.00
        )
        Course.objects.create(
            title='Intermediate Django Backend',
            short_description='Web development with Python Django',
            instructor=self.instructor,
            category=self.category,
            difficulty=Course.Difficulty.INTERMEDIATE,
            status=Course.Status.DRAFT # Draft should NOT show in catalog
        )

        # 1. Test basic catalog list (only published should show)
        response = self.client.get(self.catalog_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # 2. Test search query
        response = self.client.get(self.catalog_url, {'search': 'PyTorch'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Advanced PyTorch')

        # 3. Test category filter
        response = self.client.get(self.catalog_url, {'category': self.category.slug})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Intro to VueJS')

        # 4. Test difficulty filter
        response = self.client.get(self.catalog_url, {'difficulty': 'ADVANCED'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Advanced PyTorch')
