from rest_framework import serializers
from .models import Section, Lesson, LessonResource

class LessonResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonResource
        fields = ('id', 'title', 'file', 'created_at')
        read_only_fields = ('id', 'created_at')


class LessonSerializer(serializers.ModelSerializer):
    resources = LessonResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = (
            'id', 'section', 'title', 'description', 'lesson_type', 
            'duration', 'video_url', 'content_text', 'content_file', 
            'external_link', 'is_preview', 'status', 'order', 'resources'
        )
        read_only_fields = ('id', 'order', 'resources')


class LessonCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = (
            'title', 'description', 'lesson_type', 'duration', 
            'video_url', 'content_text', 'content_file', 'external_link', 
            'is_preview', 'status'
        )

    def validate_duration(self, value):
        if value < 0:
            raise serializers.ValidationError("Duration cannot be negative.")
        return value


class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ('id', 'course', 'title', 'order', 'lessons', 'duration')
        read_only_fields = ('id', 'order', 'lessons', 'duration')

    def get_duration(self, obj) -> int:
        """
        Aggregates duration of all published lessons in this section.
        """
        return sum(lesson.duration for lesson in obj.lessons.filter(status=Lesson.Status.PUBLISHED))


class SectionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ('title',)
