from rest_framework import serializers
from apps.courses.serializers import CourseListSerializer
from .models import WishlistItem

class WishlistItemSerializer(serializers.ModelSerializer):
    course_details = CourseListSerializer(source='course', read_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'course', 'course_details', 'created_at']
