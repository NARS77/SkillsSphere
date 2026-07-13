from rest_framework import serializers
from .models import Review, ReviewReply, ReviewHelpful, ReviewReport

class ReviewReplySerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)

    class Meta:
        model = ReviewReply
        fields = ['id', 'instructor_name', 'content', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    reply = ReviewReplySerializer(read_only=True)
    helpful_count = serializers.IntegerField(source='helpful_votes.count', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'student_name', 'course', 'rating', 'content', 
            'is_pinned', 'is_hidden', 'helpful_count', 'reply', 
            'reported_count', 'created_at'
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['course', 'rating', 'content']
