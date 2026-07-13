from rest_framework import serializers
from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'content', 'attachment', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['sender', 'is_read', 'read_at']


class ConversationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'student', 'student_name', 'instructor', 'instructor_name', 
            'is_archived_by_student', 'is_archived_by_instructor', 
            'last_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['student']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('created_at').last()
        if msg:
            return MessageSerializer(msg).data
        return None
