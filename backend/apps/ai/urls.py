from django.urls import path
from .views import (
    AITutorView,
    AICourseBuilderView,
    AIQuizGeneratorView,
    AIAssignmentEvaluatorView,
    AIFlashcardsView,
    AIStudyPlannerView,
    AIRecommendationsView,
    AIUsageAnalyticsView,
)

urlpatterns = [
    path("tutor/chat/", AITutorView.as_view(), name="ai-tutor-chat"),
    path("course-builder/generate/", AICourseBuilderView.as_view(), name="ai-course-builder"),
    path("quiz-generator/generate/", AIQuizGeneratorView.as_view(), name="ai-quiz-generator"),
    path("assignment-feedback/grade/", AIAssignmentEvaluatorView.as_view(), name="ai-assignment-feedback"),
    path("flashcards/generate/", AIFlashcardsView.as_view(), name="ai-flashcards-generate"),
    path("study-planner/schedule/", AIStudyPlannerView.as_view(), name="ai-study-planner"),
    path("recommendations/", AIRecommendationsView.as_view(), name="ai-recommendations"),
    path("analytics/usage/", AIUsageAnalyticsView.as_view(), name="ai-usage-analytics"),
]
