from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source="student.email", read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Certificate
        fields = [
            "id",
            "enrollment",
            "student",
            "student_email",
            "student_name",
            "course",
            "course_title",
            "certificate_id",
            "issued_at",
            "pdf_file",
            "verification_url",
            "qr_code_image",
        ]

    def get_student_name(self, obj):
        student = obj.student
        return f"{student.first_name} {student.last_name}".strip() or student.username
