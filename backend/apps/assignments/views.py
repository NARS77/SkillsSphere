from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from .models import Assignment, AssignmentSubmission
from .serializers import AssignmentSerializer, AssignmentSubmissionSerializer
from .services import AssignmentService


class AssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        course_id = self.request.query_params.get("course_id")
        qs = Assignment.objects.all()
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    @action(detail=True, methods=["post"], url_path="submit")
    def submit_assignment(self, request, pk=None):
        student = request.user
        file = request.FILES.get("file")
        github_repo_url = request.data.get("github_repo_url", "")
        text_submission = request.data.get("text_submission", "")

        # Quick validation
        if not file and not github_repo_url and not text_submission:
            raise ValidationException("Please upload a file, input a GitHub repo URL, or write a text answer.")

        submission = AssignmentService.submit_assignment(
            student=student,
            assignment_id=pk,
            file=file,
            github_repo_url=github_repo_url,
            text_submission=text_submission,
        )
        serializer = AssignmentSubmissionSerializer(submission)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AssignmentSubmission.objects.all()
    serializer_class = AssignmentSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        assignment_id = self.request.query_params.get("assignment_id")

        qs = AssignmentSubmission.objects.all()
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)

        if user.role == "INSTRUCTOR":
            # Instructors see submissions for their courses
            return qs.filter(assignment__course__instructor=user)
        # Students see their own
        return qs.filter(student=user)

    @action(detail=True, methods=["post"], url_path="grade")
    def grade_submission(self, request, pk=None):
        grader = request.user
        if grader.role != "INSTRUCTOR":
            return Response({"error": "Only instructors can grade assignments."}, status=status.HTTP_430_FORBIDDEN)

        score = request.data.get("score")
        if score is None:
            raise ValidationException("A grade score is required.")

        feedback = request.data.get("feedback", "")
        rubric_scoring = request.data.get("rubric_scoring", {})

        submission = AssignmentService.grade_submission(
            submission_id=pk, grader=grader, score=score, feedback=feedback, rubric_scoring=rubric_scoring
        )
        serializer = AssignmentSubmissionSerializer(submission)
        return Response(serializer.data, status=status.HTTP_200_OK)
