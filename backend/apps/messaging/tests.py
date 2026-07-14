from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.exceptions import ValidationException
from .models import Conversation, Message
from .services import MessagingService

User = get_user_model()


class MessagingServiceTestCase(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student1", email="student1@test.com", password="password123", role=User.Role.STUDENT
        )
        self.instructor = User.objects.create_user(
            username="instructor1", email="instructor1@test.com", password="password123", role=User.Role.INSTRUCTOR
        )

    def test_start_conversation_with_non_instructor(self):
        other_student = User.objects.create_user(
            username="student2", email="student2@test.com", password="password123", role=User.Role.STUDENT
        )
        with self.assertRaises(ValidationException) as context:
            MessagingService.get_or_create_conversation(self.student, other_student.id)
        self.assertIn("only be started with course instructors", str(context.exception))

    def test_send_message_and_read_receipts(self):
        conv = MessagingService.get_or_create_conversation(self.student, self.instructor.id)

        # Student sends message
        msg = MessagingService.send_message(self.student, conv.id, "Hello teacher!")
        self.assertEqual(msg.content, "Hello teacher!")
        self.assertFalse(msg.is_read)

        # Instructor reads message
        MessagingService.mark_as_read(self.instructor, conv.id)
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)
        self.assertIsNotNone(msg.read_at)
