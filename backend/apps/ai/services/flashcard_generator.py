import json
from .ai_gateway import AIGateway


class AIFlashcardGenerator:
    """
    Generates front/back concept flashcard cards from lesson texts.
    """

    def __init__(self):
        self.gateway = AIGateway()

    def generate_flashcards(self, user, course, lesson_title: str, lesson_content: str) -> list:
        from apps.ai.prompts import PromptRegistry

        template = PromptRegistry.get_prompt("flashcard_generator")
        prompt = template.render(lesson_title=lesson_title, lesson_content=lesson_content[:3000])

        response_text = self.gateway.execute_prompt(
            user=user,
            course=course,
            feature_name="flashcard_generator",
            prompt=prompt,
            system_instruction=template.system_instruction,
        )

        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception:
            return [{"front": f"Core topic of {lesson_title}?", "back": "The primary concepts taught in this lecture."}]
