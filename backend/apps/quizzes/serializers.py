from rest_framework import serializers
from .models import Quiz, Question, AnswerOption, QuizAttempt, QuestionAttempt

class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'text', 'match_text', 'order', 'is_correct']
        extra_kwargs = {
            'is_correct': {'write_only': True} # hide correct flags by default
        }

class AnswerOptionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'text', 'match_text', 'order', 'is_correct']


class QuestionSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_type', 'prompt', 'image', 
            'explanation', 'difficulty', 'weight', 'tags', 
            'partial_credit', 'order', 'options'
        ]

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        for opt in options_data:
            AnswerOption.objects.create(question=question, **opt)
        return question

class QuestionDetailSerializer(serializers.ModelSerializer):
    options = AnswerOptionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_type', 'prompt', 'image', 
            'explanation', 'difficulty', 'weight', 'tags', 
            'partial_credit', 'order', 'options'
        ]


class QuizSerializer(serializers.ModelSerializer):
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'lesson', 'title', 'description', 'instructions',
            'passing_percentage', 'max_attempts', 'time_limit', 
            'available_from', 'available_until', 'randomize_questions',
            'randomize_answer_order', 'negative_marking', 'require_passing',
            'status', 'questions_count'
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'lesson', 'title', 'description', 'instructions',
            'passing_percentage', 'max_attempts', 'time_limit', 
            'available_from', 'available_until', 'randomize_questions',
            'randomize_answer_order', 'negative_marking', 'require_passing',
            'status', 'questions'
        ]


class QuestionAttemptSerializer(serializers.ModelSerializer):
    question = QuestionDetailSerializer(read_only=True)

    class Meta:
        model = QuestionAttempt
        fields = [
            'id', 'question', 'selected_options', 'text_answer',
            'ordering_answer', 'matching_answer', 'score', 'is_correct',
            'graded', 'flagged', 'time_spent'
        ]


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'status', 'score',
            'percentage', 'passed', 'started_at', 'submitted_at'
        ]


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    question_attempts = QuestionAttemptSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    time_limit = serializers.IntegerField(source='quiz.time_limit', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'time_limit', 'student', 'status', 'score',
            'percentage', 'passed', 'started_at', 'submitted_at', 'question_attempts'
        ]
