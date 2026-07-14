from rest_framework import serializers
from .models import Badge, UserAchievement


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description", "icon", "badge_type"]


class UserAchievementSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ["id", "student", "badge", "unlocked_at"]
