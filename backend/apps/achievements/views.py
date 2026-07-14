from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Badge, UserAchievement
from .serializers import BadgeSerializer, UserAchievementSerializer
from apps.authentication.models import Profile


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer


class UserAchievementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UserAchievement.objects.all()
    serializer_class = UserAchievementSerializer

    def get_queryset(self):
        return UserAchievement.objects.filter(student=self.request.user)

    @action(detail=False, methods=["get"], url_path="my-stats")
    def my_stats(self, request):
        user = request.user
        profile, created = Profile.objects.get_or_create(user=user)

        # Calculate level (e.g. 1 level per 100 XP)
        level = (profile.xp // 100) + 1

        unlocked_badges = UserAchievement.objects.filter(student=user).values_list("badge_id", flat=True)
        locked_badges = Badge.objects.exclude(id__in=unlocked_badges)

        locked_serializer = BadgeSerializer(locked_badges, many=True)
        unlocked_serializer = UserAchievementSerializer(UserAchievement.objects.filter(student=user), many=True)

        return Response(
            {
                "xp": profile.xp,
                "streak": profile.streak,
                "level": level,
                "last_activity_date": profile.last_activity_date,
                "unlocked": unlocked_serializer.data,
                "locked": locked_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
