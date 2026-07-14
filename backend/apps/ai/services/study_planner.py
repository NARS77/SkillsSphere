import json
from .ai_gateway import AIGateway


class AIStudyPlanner:
    """
    Coordinates and builds personalized learning calendars and schedules.
    """

    def __init__(self):
        self.gateway = AIGateway()

    def generate_schedule(self, user, target_hours: int, completion_date: str) -> dict:
        from apps.ai.prompts import PromptRegistry

        template = PromptRegistry.get_prompt("study_planner")
        prompt = template.render(target_hours=target_hours, completion_date=completion_date)

        response_text = self.gateway.execute_prompt(
            user=user,
            course=None,
            feature_name="study_planner",
            prompt=prompt,
            system_instruction=template.system_instruction,
        )

        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception:
            return {
                "weekly_hours": target_hours,
                "target_date": completion_date,
                "schedule": [
                    {"day": "Monday", "hours": 2, "activity": "Watch lecture videos"},
                    {"day": "Wednesday", "hours": 3, "activity": "Complete coding assignments"},
                    {"day": "Friday", "hours": 2, "activity": "Flashcards and quiz review"},
                ],
            }
