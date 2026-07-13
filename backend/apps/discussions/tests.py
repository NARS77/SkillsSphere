from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Category
from apps.core.exceptions import ValidationException
from .models import DiscussionThread, DiscussionReply, ThreadVote, ReplyVote
from .services import DiscussionService

User = get_user_model()

class DiscussionsServiceTestCase(TestCase):
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
        self.category = Category.objects.create(name='Design', icon='paint', color='rose')
        self.course = Course.objects.create(
            title='UI/UX Design',
            short_description='Learn UI/UX',
            description='Detailed course desc',
            instructor=self.instructor,
            category=self.category,
            price=49.99
        )

    def test_create_thread(self):
        thread = DiscussionService.create_thread(
            course_id=self.course.id,
            author=self.student,
            title='Question about Figma',
            content='How do I export components?'
        )
        self.assertEqual(thread.title, 'Question about Figma')
        self.assertEqual(thread.course, self.course)
        self.assertEqual(thread.author, self.student)

    def test_reply_to_locked_thread(self):
        thread = DiscussionService.create_thread(
            course_id=self.course.id,
            author=self.student,
            title='Question about Figma',
            content='How do I export components?'
        )
        DiscussionService.lock_thread(self.instructor, thread.id, True)
        
        with self.assertRaises(ValidationException) as context:
            DiscussionService.add_reply(thread.id, self.instructor, "You export them using CMD+E")
        self.assertIn("locked and cannot receive replies", str(context.exception))

    def test_accept_reply_permissions(self):
        thread = DiscussionService.create_thread(
            course_id=self.course.id,
            author=self.student,
            title='Question about Figma',
            content='How do I export components?'
        )
        reply = DiscussionService.add_reply(thread.id, self.instructor, "Use Export pane.")
        
        # Student trying to accept -> should fail
        with self.assertRaises(ValidationException):
            DiscussionService.accept_reply(self.student, reply.id)

        # Instructor accepts -> succeeds
        updated_reply = DiscussionService.accept_reply(self.instructor, reply.id)
        self.assertTrue(updated_reply.is_accepted)
