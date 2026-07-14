from rest_framework import serializers
from apps.courses.serializers import CourseListSerializer
from .models import Enrollment, UserProgress, WatchHistory, Bookmark


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "course", "is_active", "completed_at", "unregistered_at", "created_at")
        read_only_fields = ("id", "course", "is_active", "completed_at", "unregistered_at", "created_at")


class UserProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProgress
        fields = ("id", "lesson", "is_completed", "completed_at")
        read_only_fields = ("id", "completed_at")


class WatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchHistory
        fields = ("id", "lesson", "last_position", "completion_percentage", "device", "watch_time", "updated_at")
        read_only_fields = ("id", "updated_at")


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bookmark
        fields = ("id", "lesson", "created_at")
        read_only_fields = ("id", "created_at")
