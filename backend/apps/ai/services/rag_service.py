from django.db.models import Q
from apps.curriculum.models import Lesson


class RAGService:
    """
    RAG service pulling relevant course curriculum and lesson contents
    to ground LLM prompts in course-specific materials.
    """

    def retrieve_grounded_context(self, course_id: str, query: str) -> str:
        # Search published lessons matching title, description, or content text
        lessons = Lesson.objects.filter(
            Q(section__course_id=course_id)
            & (Q(title__icontains=query) | Q(description__icontains=query) | Q(content_text__icontains=query))
        )[:3]

        if not lessons.exists():
            # Fall back to returning all lessons in course to provide some context
            lessons = Lesson.objects.filter(section__course_id=course_id)[:3]

        context_blocks = []
        for index, lesson in enumerate(lessons, 1):
            text_snippet = lesson.content_text[:1500] if lesson.content_text else lesson.description
            block = (
                f"Source Doc {index}: {lesson.title} ({lesson.get_lesson_type_display()})\n"
                f"Content:\n{text_snippet}\n"
            )
            context_blocks.append(block)

        return "\n---\n".join(context_blocks)

    def format_grounded_tutor_instruction(self, context: str) -> str:
        from apps.ai.prompts import PromptRegistry

        template = PromptRegistry.get_prompt("tutor_assistant")
        return f"{template.system_instruction}\n\nHere is the retrieved course context:\n{context}"
