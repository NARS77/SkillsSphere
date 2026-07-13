from rest_framework import serializers
from .models import GradebookEntry

class GradebookEntrySerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = GradebookEntry
        fields = [
            'id', 'enrollment', 'student', 'student_email', 'student_name', 
            'course', 'course_title', 'quiz_average', 'assignment_average', 
            'overall_score', 'grade_letter', 'passed', 'updated_at'
        ]

    def get_student_name(self, obj):
        student = obj.student
        return f"{student.first_name} {student.last_name}".strip() or student.username
