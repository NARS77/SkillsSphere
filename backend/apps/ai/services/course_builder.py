import json
from .ai_gateway import AIGateway


class AICourseBuilder:
    """
    Service helping instructors auto-generate structured course syllabus blueprints.
    """

    def __init__(self):
        self.gateway = AIGateway()

    def generate_blueprint(self, user, description: str) -> dict:
        from apps.ai.prompts import PromptRegistry

        template = PromptRegistry.get_prompt("course_builder")
        prompt = template.render(description=description)

        response_text = self.gateway.execute_prompt(
            user=user,
            course=None,
            feature_name="course_builder",
            prompt=prompt,
            system_instruction=template.system_instruction,
        )

        # Parse output safely
        try:
            # Strip potential markdown formatting if returned
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception:
            # Return placeholder if generation failed to parse
            return {
                "title": "New Generated Course",
                "description": f"Outline blueprint generated from: {description}",
                "prerequisites": "None",
                "outcomes": "Master core concepts of the topic",
                "sections": [
                    {
                        "title": "Module 1: Introduction",
                        "order": 1,
                        "lessons": [
                            {"title": "Lesson 1.1: Getting Started", "lesson_type": "VIDEO", "duration": 10},
                            {"title": "Lesson 1.2: Environment Setup", "lesson_type": "ARTICLE", "duration": 15},
                        ],
                    }
                ],
            }
