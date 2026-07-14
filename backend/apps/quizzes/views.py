from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from .models import Quiz, Question, AnswerOption, QuizAttempt, QuestionAttempt
from .serializers import (
    QuizSerializer,
    QuizDetailSerializer,
    QuestionSerializer,
    QuestionDetailSerializer,
    AnswerOptionSerializer,
    QuizAttemptSerializer,
    QuizAttemptDetailSerializer,
)
from .services import QuizService


class QuizViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Quiz.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuizDetailSerializer
        return QuizSerializer

    def get_queryset(self):
        # Instructors can see all, students can only see published quizzes
        user = self.request.user
        course_id = self.request.query_params.get("course_id")

        qs = Quiz.objects.all()
        if course_id:
            qs = qs.filter(course_id=course_id)

        if user.role == "STUDENT":
            qs = qs.filter(status=Quiz.Status.PUBLISHED)
        return qs

    @action(detail=True, methods=["post"], url_path="start")
    def start_attempt(self, request, pk=None):
        student = request.user
        attempt = QuizService.start_quiz_attempt(student, pk)
        serializer = QuizAttemptDetailSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Question.objects.all()

    def get_serializer_class(self):
        if self.action in ["retrieve", "list"]:
            return QuestionDetailSerializer
        return QuestionSerializer


class AnswerOptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AnswerOption.objects.all()
    serializer_class = AnswerOptionSerializer


class QuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = QuizAttempt.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuizAttemptDetailSerializer
        return QuizAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "INSTRUCTOR":
            return QuizAttempt.objects.all()
        return QuizAttempt.objects.filter(student=user)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit_attempt(self, request, pk=None):
        student = request.user
        answers = request.data.get("answers", {})
        attempt = QuizService.submit_quiz_attempt(student, pk, answers)
        serializer = QuizAttemptDetailSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_200_OK)
