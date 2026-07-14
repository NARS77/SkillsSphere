from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuizViewSet, QuestionViewSet, AnswerOptionViewSet, QuizAttemptViewSet

router = DefaultRouter()
router.register(r"quizzes", QuizViewSet, basename="quiz")
router.register(r"questions", QuestionViewSet, basename="question")
router.register(r"options", AnswerOptionViewSet, basename="option")
router.register(r"quiz-attempts", QuizAttemptViewSet, basename="quiz-attempt")

urlpatterns = [
    path("", include(router.urls)),
]
