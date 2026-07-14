from rest_framework import views, permissions, serializers, viewsets
from rest_framework.response import Response
from django.db.models import Q
from apps.courses.models import Course, SavedSearch
from apps.curriculum.models import Lesson
from apps.discussions.models import DiscussionThread
from apps.authentication.models import User


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ("id", "query", "filters", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        return SavedSearch.objects.create(student=user, **validated_data)


class SavedSearchViewSet(viewsets.ModelViewSet):
    serializer_class = SavedSearchSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return SavedSearch.objects.filter(student=self.request.user)


class GlobalSearchView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, *args, **kwargs):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"courses": [], "lessons": [], "discussions": [], "instructors": []})

        from apps.courses.search import SearchService

        service = SearchService()
        results = service.search_all(query, user=request.user)
        return Response(results)
