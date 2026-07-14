from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel, UUIDModel


class Quiz(BaseBusinessModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="quizzes")
    lesson = models.OneToOneField(
        "curriculum.Lesson", null=True, blank=True, on_delete=models.SET_NULL, related_name="quiz"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    instructions = models.TextField(blank=True, default="")

    passing_percentage = models.IntegerField(default=60)
    max_attempts = models.IntegerField(default=0, help_text="0 for unlimited attempts")
    time_limit = models.IntegerField(default=0, help_text="Time limit in minutes, 0 for no limit")

    available_from = models.DateTimeField(null=True, blank=True)
    available_until = models.DateTimeField(null=True, blank=True)

    randomize_questions = models.BooleanField(default=False)
    randomize_answer_order = models.BooleanField(default=False)
    negative_marking = models.BooleanField(default=False)
    require_passing = models.BooleanField(default=False, help_text="Require passing before unlocking next section")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    def __str__(self):
        return f"Quiz: {self.title} ({self.status})"


class Question(BaseBusinessModel):
    class QuestionType(models.TextChoices):
        SINGLE = "SINGLE", "Multiple Choice (Single Answer)"
        MULTI = "MULTI", "Multiple Choice (Multiple Answers)"
        TF = "TF", "True / False"
        SHORT = "SHORT", "Short Answer"
        FILL = "FILL", "Fill in the Blank"
        MATCH = "MATCH", "Matching"
        ORDER = "ORDER", "Ordering"
        PREDICT = "PREDICT", "Code Output Prediction"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.SINGLE)
    prompt = models.TextField()
    image = models.ImageField(upload_to="quizzes/questions/", null=True, blank=True)
    explanation = models.TextField(blank=True, default="")
    difficulty = models.CharField(max_length=20, default="MEDIUM")  # EASY, MEDIUM, HARD
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    tags = models.CharField(max_length=255, blank=True, default="")
    partial_credit = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"Question ({self.question_type}): {self.prompt[:50]}"


class AnswerOption(UUIDModel):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.TextField()
    match_text = models.TextField(
        blank=True, default="", help_text="For matching questions, the correct match on the right side"
    )
    order = models.IntegerField(default=0, help_text="For ordering questions, correct sequence index")
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Option for {self.question.id}: {self.text[:30]}"


class QuizAttempt(BaseBusinessModel):
    class Status(models.TextChoices):
        STARTED = "STARTED", "Started"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        SUBMITTED = "SUBMITTED", "Submitted"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.STARTED)
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(default=False)

    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Attempt by {self.student.email} on {self.quiz.title} (Passed: {self.passed})"


class QuestionAttempt(UUIDModel):
    quiz_attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="question_attempts")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_options = models.ManyToManyField(AnswerOption, blank=True)
    text_answer = models.TextField(blank=True, default="")
    ordering_answer = models.JSONField(null=True, blank=True, help_text="JSON list of option IDs in student's order")
    matching_answer = models.JSONField(
        null=True, blank=True, help_text="JSON dict mapping option ID to matching answer text"
    )

    score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    is_correct = models.BooleanField(default=False)
    graded = models.BooleanField(default=True)
    flagged = models.BooleanField(default=False)
    time_spent = models.IntegerField(default=0, help_text="seconds spent on this question")

    def __str__(self):
        return f"QuestionAttempt for attempt {self.quiz_attempt.id} question {self.question.id}"
