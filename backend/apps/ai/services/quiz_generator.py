import json
from .ai_gateway import AIGateway

class AIQuizGenerator:
    """
    Generates MCQs and True/False questions dynamically from lesson text.
    """
    def __init__(self):
        self.gateway = AIGateway()

    def generate_quiz_questions(self, user, course, lesson_title: str, lesson_content: str, difficulty: str = 'medium') -> list:
        from apps.ai.prompts import PromptRegistry
        template = PromptRegistry.get_prompt("quiz_generator")
        prompt = template.render(
            lesson_title=lesson_title,
            lesson_content=lesson_content[:3000],
            difficulty=difficulty
        )

        response_text = self.gateway.execute_prompt(
            user=user,
            course=course,
            feature_name='quiz_generator',
            prompt=prompt,
            system_instruction=template.system_instruction
        )

        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception:
            return [
                {
                    "question_text": f"What is the primary theme discussed in {lesson_title}?",
                    "choices": [
                        {"text": "The main technical concept", "is_correct": True},
                        {"text": "An unrelated topic", "is_correct": False}
                    ]
                }
            ]
