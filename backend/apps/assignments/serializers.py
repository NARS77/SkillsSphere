from rest_framework import serializers
from .models import Assignment, AssignmentSubmission


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            "id",
            "course",
            "lesson",
            "title",
            "instructions",
            "due_date",
            "max_score",
            "rubric",
            "late_submission_rule",
            "late_penalty_percentage",
        ]


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    student_email = serializers.CharField(source="student.email", read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            "id",
            "assignment",
            "assignment_title",
            "student",
            "student_email",
            "student_name",
            "file",
            "github_repo_url",
            "text_submission",
            "status",
            "score",
            "feedback",
            "rubric_scoring",
            "submitted_at",
            "graded_at",
            "graded_by",
        ]
        read_only_fields = ["student", "status", "score", "feedback", "rubric_scoring", "graded_at", "graded_by"]

    def get_student_name(self, obj):
        student = obj.student
        return f"{student.first_name} {student.last_name}".strip() or student.username
