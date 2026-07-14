import json
import uuid
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.exceptions import ValidationException
from apps.courses.models import Course
from apps.curriculum.models import Lesson
from apps.assignments.models import Assignment

from .models import ConversationMemory, TokenUsage
from .services.ai_gateway import AIGateway
from .services.rag_service import RAGService
from .services.course_builder import AICourseBuilder
from .services.quiz_generator import AIQuizGenerator
from .services.assignment_evaluator import AIAssignmentEvaluator
from .services.flashcard_generator import AIFlashcardGenerator
from .services.study_planner import AIStudyPlanner
from .services.recommendation_service import AIRecommendationService
from .services.moderation_service import AIModerationService


class AITutorView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        course_id = request.data.get("course_id")
        prompt = request.data.get("prompt")
        session_id = request.data.get("session_id")

        if not course_id or not prompt:
            raise ValidationException("course_id and prompt parameters are required.")

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise ValidationException("Course not found.")

        # 1. Fetch or create chat thread session
        if session_id:
            try:
                convo = ConversationMemory.objects.get(session_id=session_id, student=request.user)
            except ConversationMemory.DoesNotExist:
                convo = ConversationMemory.objects.create(student=request.user, course=course)
        else:
            convo = ConversationMemory.objects.create(student=request.user, course=course)

        # 2. Retrieve grounded RAG context
        rag = RAGService()
        context = rag.retrieve_grounded_context(course_id, prompt)
        system_instruction = rag.format_grounded_tutor_instruction(context)

        # 3. Stream Response via SSE
        gateway = AIGateway()

        # Append query to local DB thread context
        convo.history.append({"role": "user", "content": prompt})
        convo.save()

        def stream_generator():
            full_response = ""
            # Yield session info first
            yield f"data: {json.dumps({'session_id': str(convo.session_id)})}\n\n"

            # Stream tokens
            for chunk in gateway.execute_stream(
                user=request.user,
                course=course,
                feature_name="ai_tutor",
                prompt=prompt,
                system_instruction=system_instruction,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'text': chunk})}\n\n"

            # Save finished response back to DB
            convo.history.append({"role": "model", "content": full_response})
            convo.save()

        return StreamingHttpResponse(stream_generator(), content_type="text/event-stream")


class AICourseBuilderView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        description = request.data.get("description")
        if not description:
            raise ValidationException("description is required.")

        builder = AICourseBuilder()
        blueprint = builder.generate_blueprint(request.user, description)
        return Response(blueprint, status=status.HTTP_200_OK)


class AIQuizGeneratorView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        lesson_id = request.data.get("lesson_id")
        difficulty = request.data.get("difficulty", "medium")

        if not lesson_id:
            raise ValidationException("lesson_id is required.")

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise ValidationException("Lesson not found.")

        generator = AIQuizGenerator()
        content = lesson.content_text or lesson.description
        questions = generator.generate_quiz_questions(
            user=request.user,
            course=lesson.section.course,
            lesson_title=lesson.title,
            lesson_content=content,
            difficulty=difficulty,
        )
        return Response(questions, status=status.HTTP_200_OK)


class AIAssignmentEvaluatorView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        assignment_id = request.data.get("assignment_id")
        submission_text = request.data.get("submission_text")

        if not assignment_id or not submission_text:
            raise ValidationException("assignment_id and submission_text are required.")

        try:
            assignment = Assignment.objects.get(id=assignment_id)
        except Assignment.DoesNotExist:
            raise ValidationException("Assignment not found.")

        evaluator = AIAssignmentEvaluator()
        feedback = evaluator.evaluate_submission(
            user=request.user,
            course=assignment.lesson.section.course,
            assignment_title=assignment.lesson.title,
            assignment_desc=assignment.description,
            submission_text=submission_text,
        )
        return Response({"feedback": feedback}, status=status.HTTP_200_OK)


class AIFlashcardsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            raise ValidationException("lesson_id is required.")

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise ValidationException("Lesson not found.")

        generator = AIFlashcardGenerator()
        content = lesson.content_text or lesson.description
        cards = generator.generate_flashcards(
            user=request.user, course=lesson.section.course, lesson_title=lesson.title, lesson_content=content
        )
        return Response(cards, status=status.HTTP_200_OK)


class AIStudyPlannerView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        target_hours = int(request.data.get("target_hours", 5))
        completion_date = request.data.get("completion_date", "2026-12-31")

        planner = AIStudyPlanner()
        schedule = planner.generate_schedule(request.user, target_hours, completion_date)
        return Response(schedule, status=status.HTTP_200_OK)


class AIRecommendationsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        service = AIRecommendationService()
        recommendations = service.get_recommendations(request.user)
        return Response(recommendations, status=status.HTTP_200_OK)


class AIUsageAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        # Calculate usage summary metrics
        usages = TokenUsage.objects.all()
        if request.user.role != "ADMIN":
            usages = usages.filter(user=request.user)

        from django.db.models import Sum, Count

        summary = usages.aggregate(
            total_requests=Count("id"),
            prompt_tokens=Sum("prompt_tokens"),
            completion_tokens=Sum("completion_tokens"),
            total_tokens=Sum("total_tokens"),
            estimated_cost=Sum("estimated_cost"),
        )

        return Response(
            {
                "total_requests": summary["total_requests"] or 0,
                "prompt_tokens": summary["prompt_tokens"] or 0,
                "completion_tokens": summary["completion_tokens"] or 0,
                "total_tokens": summary["total_tokens"] or 0,
                "estimated_cost": float(summary["estimated_cost"] or 0.0),
            },
            status=status.HTTP_200_OK,
        )
