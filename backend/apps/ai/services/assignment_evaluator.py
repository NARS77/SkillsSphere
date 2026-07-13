from .ai_gateway import AIGateway

class AIAssignmentEvaluator:
    """
    Evaluates student assignment submissions (code or essays) and returns critical feedback.
    """
    def __init__(self):
        self.gateway = AIGateway()

    def evaluate_submission(self, user, course, assignment_title: str, assignment_desc: str, submission_text: str) -> str:
        from apps.ai.prompts import PromptRegistry
        template = PromptRegistry.get_prompt("assignment_evaluator")
        prompt = template.render(
            assignment_title=assignment_title,
            assignment_desc=assignment_desc,
            submission_text=submission_text
        )

        return self.gateway.execute_prompt(
            user=user,
            course=course,
            feature_name='assignment_evaluator',
            prompt=prompt,
            system_instruction=template.system_instruction
        )
