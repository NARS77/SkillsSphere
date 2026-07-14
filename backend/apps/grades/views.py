from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import GradebookEntry
from .serializers import GradebookEntrySerializer
from .services import GradebookService
from apps.courses.models import Course


class GradebookEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = GradebookEntry.objects.all()
    serializer_class = GradebookEntrySerializer

    def get_queryset(self):
        user = self.request.user
        course_id = self.request.query_params.get("course_id")

        qs = GradebookEntry.objects.all()
        if course_id:
            qs = qs.filter(course_id=course_id)

        if user.role == "INSTRUCTOR":
            # Instructors can see grades for courses they teach
            return qs.filter(course__instructor=user)
        # Students see their own
        return qs.filter(student=user)

    @action(detail=False, methods=["get"], url_path="courses/(?P<course_pk>[^/.]+)/export")
    def export_gradebook(self, request, course_pk=None):
        course = get_object_or_404(Course, id=course_pk)

        # Enforce permissions
        if request.user.role != "INSTRUCTOR" or course.instructor != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_430_FORBIDDEN)

        csv_data = GradebookService.export_gradebook_csv(course)
        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="gradebook_{course.slug}.csv"'
        return response

    @action(detail=False, methods=["post"], url_path="courses/(?P<course_pk>[^/.]+)/recalculate")
    def recalculate_gradebook(self, request, course_pk=None):
        course = get_object_or_404(Course, id=course_pk)
        if request.user.role != "INSTRUCTOR" or course.instructor != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_430_FORBIDDEN)

        # Find all student enrollments
        from apps.enrollments.models import Enrollment

        enrollments = Enrollment.objects.filter(course=course, is_active=True)
        for enroll in enrollments:
            GradebookService.recalculate_gradebook_entry(enroll.student, course)

        return Response({"message": "Recalculation triggered successfully."}, status=status.HTTP_200_OK)
