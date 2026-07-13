from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.exceptions import ValidationException
from apps.core.models import Notification
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class MessagingService:
    @staticmethod
    def get_or_create_conversation(student, instructor_id):
        instructor = get_object_or_404(User, id=instructor_id)
        if instructor.role != User.Role.INSTRUCTOR:
            raise ValidationException("Conversations can only be started with course instructors.")
            
        conversation, created = Conversation.objects.get_or_create(
            student=student,
            instructor=instructor
        )
        return conversation

    @staticmethod
    def send_message(sender, conversation_id, content, attachment=None):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Check permissions
        if sender != conversation.student and sender != conversation.instructor:
            raise ValidationException("You are not a participant in this conversation.")

        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content,
            attachment=attachment
        )
        
        # Trigger updated timestamp on conversation to sort it to the top
        conversation.updated_at = timezone.now()
        conversation.save()

        # Notify recipient
        recipient = conversation.instructor if sender == conversation.student else conversation.student
        Notification.objects.create(
            user=recipient,
            title="New Private Message",
            message=f"{sender.username} sent you a private message.",
            notification_type="NEW_MESSAGE"
        )
        
        return message

    @staticmethod
    def mark_as_read(user, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=user)
        
        unread_messages.update(is_read=True, read_at=timezone.now())

    @staticmethod
    def archive_conversation(user, conversation_id, archive_status=True):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if user == conversation.student:
            conversation.is_archived_by_student = archive_status
        elif user == conversation.instructor:
            conversation.is_archived_by_instructor = archive_status
        conversation.save()
        return conversation
