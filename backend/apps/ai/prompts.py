import os
from typing import Dict, Any


class PromptTemplate:
    """
    Encapsulates a system prompt and user template.
    """

    def __init__(self, template: str, system_instruction: str, version: str = "1.0.0"):
        self.template = template
        self.system_instruction = system_instruction
        self.version = version

    def render(self, **kwargs) -> str:
        return self.template.format(**kwargs)


class PromptRegistry:
    """
    Central repository for all AI prompt templates, system instructions, and versions.
    """

    _prompts: Dict[str, PromptTemplate] = {
        "course_builder": PromptTemplate(
            system_instruction="You are an expert curriculum builder specializing in technical syllabus architecture.",
            template=(
                "Generate a professional, structured course blueprint based on this description:\n"
                '"{description}"\n\n'
                "Return the syllabus blueprint in valid JSON format ONLY. Do not wrap in markdown codeblocks. "
                "Use the following structure:\n"
                "{{\n"
                '  "title": "Course Title",\n'
                '  "description": "Course Description",\n'
                '  "prerequisites": "Prerequisites list",\n'
                '  "outcomes": "Learning outcomes",\n'
                '  "sections": [\n'
                "    {{\n"
                '      "title": "Section Title",\n'
                '      "order": 1,\n'
                '      "lessons": [\n'
                "        {{\n"
                '          "title": "Lesson Title",\n'
                '          "lesson_type": "VIDEO",\n'
                '          "duration": 15\n'
                "        }}\n"
                "      ]\n"
                "    }}\n"
                "  ]\n"
                "}}"
            ),
            version="1.0.0",
        ),
        "assignment_evaluator": PromptTemplate(
            system_instruction="You are a strict yet constructive code reviewer and academic grader.",
            template=(
                'You are grading this assignment: "{assignment_title}"\n'
                "Guidelines:\n{assignment_desc}\n\n"
                "Student Submission:\n{submission_text}\n\n"
                "Please write a structured evaluation covering:\n"
                "1. Strengths: What the student did well.\n"
                "2. Weaknesses: Any technical deficits or errors.\n"
                "3. Missing Requirements: Things specified in the description but omitted.\n"
                "4. Suggestions for Improvement: Actionable feedback.\n"
                "5. Recommended score: Suggest a numerical score out of 100 with explanation."
            ),
            version="1.0.0",
        ),
        "flashcard_generator": PromptTemplate(
            system_instruction="You are a study card designer optimizing material for memory retention and active recall.",
            template=(
                'Generate a set of study flashcards for: "{lesson_title}" based on this content:\n\n'
                "Content:\n{lesson_content}\n\n"
                "Requirements:\n"
                "1. Generate 3 flashcard pairs.\n"
                "2. Return flashcards in valid JSON format list ONLY. Do not wrap in markdown codeblocks. "
                "Use the following structure:\n"
                "[\n"
                "  {{\n"
                '    "front": "Question or Concept?",\n'
                '    "back": "Short definition or answer details."\n'
                "  }}\n"
                "]"
            ),
            version="1.0.0",
        ),
        "quiz_generator": PromptTemplate(
            system_instruction="You are an academic assessment designer specializing in generating accurate testing questions.",
            template=(
                'Generate a lesson quiz on: "{lesson_title}" using the content below:\n\n'
                "Content:\n{lesson_content}\n\n"
                "Requirements:\n"
                "1. Generate 3 multiple choice questions.\n"
                "2. Difficulty level: {difficulty}.\n"
                "3. Return the quiz in valid JSON format list ONLY. Do not wrap in markdown codeblocks. "
                "Use the following structure:\n"
                "[\n"
                "  {{\n"
                '    "question_text": "Question definition?",\n'
                '    "choices": [\n'
                '      {{"text": "Choice A", "is_correct": true}},\n'
                '      {{"text": "Choice B", "is_correct": false}}\n'
                "    ]\n"
                "  }}\n"
                "]"
            ),
            version="1.0.0",
        ),
        "study_planner": PromptTemplate(
            system_instruction="You are a personal productivity coach and academic scheduler.",
            template=(
                "Generate a study planner schedule for a student who wants to complete their courses.\n"
                "Target Study Hours per week: {target_hours} hours\n"
                "Target Completion Date: {completion_date}\n\n"
                "Return the plan in valid JSON format ONLY. Do not wrap in markdown codeblocks. "
                "Use the structure:\n"
                "{{\n"
                '  "weekly_hours": 10,\n'
                '  "target_date": "2026-08-30",\n'
                '  "schedule": [\n'
                '    {{"day": "Monday", "hours": 2, "activity": "Watch lecture videos"}},\n'
                '    {{"day": "Wednesday", "hours": 3, "activity": "Complete coding assignments"}},\n'
                '    {{"day": "Friday", "hours": 2, "activity": "Flashcards and quiz review"}}\n'
                "  ]\n"
                "}}"
            ),
            version="1.0.0",
        ),
        "tutor_assistant": PromptTemplate(
            system_instruction=(
                "You are a helpful, smart AI course teaching assistant inside SkillSphere.\n"
                "Your task is to answer the student's questions grounded in the course material below.\n"
                "If the answer cannot be found in the provided context, answer politely based on general "
                "programming best practices but clarify that it is not explicitly covered in the course."
            ),
            template=("Retrieved course context:\n{context}\n\n" "Student Question:\n{query}"),
            version="1.0.0",
        ),
    }

    @classmethod
    def get_prompt(cls, name: str) -> PromptTemplate:
        if name not in cls._prompts:
            raise KeyError(f"Prompt template '{name}' is not registered.")
        return cls._prompts[name]

    @classmethod
    def test_render(cls, name: str, **kwargs) -> str:
        """
        Utility for testing prompts with dummy kwargs.
        """
        template = cls.get_prompt(name)
        return template.render(**kwargs)
