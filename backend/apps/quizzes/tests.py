from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.courses.models import Course
from apps.curriculum.models import Section, Lesson
from apps.quizzes.models import Quiz, Question, AnswerOption, QuizAttempt
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.grades.models import GradebookEntry
from apps.certificates.models import Certificate
from apps.achievements.models import Badge, UserAchievement
from apps.achievements.services import XPService
from apps.enrollments.models import Enrollment

User = get_user_model()

class AssessmentAPITests(APITestCase):
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

        # Create course
        self.course = Course.objects.create(
            title='Django Advanced Development',
            instructor=self.instructor,
            status=Course.Status.PUBLISHED
        )

        # Enroll student
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )

        # Create curriculum outline
        self.section = Section.objects.create(course=self.course, title='Section 1', order=1)
        self.lesson = Lesson.objects.create(
            section=self.section, 
            title='Lesson 1', 
            lesson_type=Lesson.LessonType.QUIZ,
            status=Lesson.Status.PUBLISHED
        )

        # Authentication tokens
        self.instructor_token = self.get_jwt_token(self.instructor)
        self.student_token = self.get_jwt_token(self.student)

    def get_jwt_token(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def set_auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_instructor_can_create_quiz(self):
        self.set_auth_header(self.instructor_token)
        url = reverse('quiz-list')
        data = {
            'course': str(self.course.id),
            'lesson': str(self.lesson.id),
            'title': 'Chapter 1 Quiz',
            'description': 'Test your basic Django skills',
            'passing_percentage': 70,
            'max_attempts': 3,
            'time_limit': 15,
            'status': 'PUBLISHED'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Chapter 1 Quiz')
        self.assertEqual(response.data['passing_percentage'], 70)

    def test_quiz_attempt_scoring_logic(self):
        # 1. Create Quiz as Instructor
        quiz = Quiz.objects.create(
            course=self.course,
            lesson=self.lesson,
            title='Django Basics',
            passing_percentage=50,
            status=Quiz.Status.PUBLISHED
        )

        # 2. Add Questions & Options
        # Question 1: MCQ Single
        q1 = Question.objects.create(quiz=quiz, question_type=Question.QuestionType.SINGLE, prompt='What is Django?', weight=10.0)
        o1_correct = AnswerOption.objects.create(question=q1, text='A web framework', is_correct=True)
        o1_wrong = AnswerOption.objects.create(question=q1, text='A database', is_correct=False)

        # Question 2: Fill in the blank
        q2 = Question.objects.create(quiz=quiz, question_type=Question.QuestionType.FILL, prompt='Django uses M_C architecture.', weight=10.0)
        AnswerOption.objects.create(question=q2, text='MTV', is_correct=True)

        # 3. Student Starts Attempt
        self.set_auth_header(self.student_token)
        start_url = reverse('quiz-start-attempt', args=[quiz.id])
        response = self.client.post(start_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        attempt_id = response.data['id']
        qa_ids = [qa['id'] for qa in response.data['question_attempts']]

        # 4. Student Submits Attempt
        # Match correct question attempts to option IDs
        qa1_id = next(qa['id'] for qa in response.data['question_attempts'] if qa['question']['id'] == str(q1.id))
        qa2_id = next(qa['id'] for qa in response.data['question_attempts'] if qa['question']['id'] == str(q2.id))

        submit_url = reverse('quiz-attempt-submit-attempt', args=[attempt_id])
        submit_data = {
            'answers': {
                str(qa1_id): {'selected_option': str(o1_correct.id)}, # Correct choice
                str(qa2_id): {'text_answer': 'MTV'} # Correct fill-in
            }
        }
        response = self.client.post(submit_url, submit_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['passed'], True)
        self.assertEqual(float(response.data['score']), 20.0)
        self.assertEqual(float(response.data['percentage']), 100.0)

    def test_assignment_submission_and_grading(self):
        # 1. Create Assignment
        assignment = Assignment.objects.create(
            course=self.course,
            title='Build a REST API',
            instructions='Create endpoints using DRF',
            due_date=timezone.now() + timezone.timedelta(days=1),
            max_score=100
        )

        # 2. Student Submits
        self.set_auth_header(self.student_token)
        submit_url = reverse('assignment-submit-assignment', args=[assignment.id])
        submit_data = {
            'github_repo_url': 'https://github.com/student/skillsphere-api',
            'text_submission': 'Completed the requirements.'
        }
        response = self.client.post(submit_url, submit_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        submission_id = response.data['id']

        # 3. Instructor Grades
        self.set_auth_header(self.instructor_token)
        grade_url = reverse('submission-grade-submission', args=[submission_id])
        grade_data = {
            'score': 85,
            'feedback': 'Good API structure, but missing pagination.',
            'rubric_scoring': {'Code Quality': 40, 'Functionality': 45}
        }
        response = self.client.post(grade_url, grade_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'GRADED')
        self.assertEqual(float(response.data['score']), 85.0)

        # 4. Check GradebookEntry Calculation
        gradebook_entry = GradebookEntry.objects.filter(student=self.student, course=self.course).first()
        self.assertIsNotNone(gradebook_entry)
        self.assertEqual(float(gradebook_entry.overall_score), 85.0)
        self.assertEqual(gradebook_entry.grade_letter, 'B')
        self.assertTrue(gradebook_entry.passed)
