import os
import uuid
import urllib.request
import io
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings
from apps.enrollments.models import Enrollment
from apps.grades.models import GradebookEntry
from .models import Certificate
from apps.core.models import Notification
from apps.achievements.services import XPService


class CertificateService:
    @staticmethod
    def verify_and_issue_certificate(student, course):
        # 1. Check if already issued
        existing = Certificate.objects.filter(student=student, course=course).first()
        if existing:
            return existing

        enrollment = Enrollment.objects.filter(student=student, course=course, is_active=True).first()
        if not enrollment:
            return None

        # 2. Check lesson completion
        from apps.curriculum.models import Lesson
        from apps.enrollments.models import UserProgress

        total_lessons = Lesson.objects.filter(section__course=course, status=Lesson.Status.PUBLISHED).count()
        completed_lessons = UserProgress.objects.filter(
            student=student, is_completed=True, lesson__section__course=course, lesson__status=Lesson.Status.PUBLISHED
        ).count()

        completion_ratio = (completed_lessons / total_lessons) if total_lessons > 0 else 1.0

        # Must have completed at least 95% of lessons
        if completion_ratio < 0.95:
            return None

        # 3. Check quizzes & assignments (GradebookEntry must exist and have passed=True)
        from apps.quizzes.models import Quiz
        from apps.assignments.models import Assignment

        quizzes_count = Quiz.objects.filter(course=course, status=Quiz.Status.PUBLISHED).count()
        assignments_count = Assignment.objects.filter(course=course).count()

        if quizzes_count > 0 or assignments_count > 0:
            grade_entry = GradebookEntry.objects.filter(enrollment=enrollment).first()
            if not grade_entry or not grade_entry.passed:
                return None

        # 4. Issue Certificate
        cert_id = f"SKSP-{uuid.uuid4().hex[:8].upper()}"
        verification_url = f"http://localhost:5173/certificates/verify/{cert_id}"

        certificate = Certificate.objects.create(
            enrollment=enrollment,
            student=student,
            course=course,
            certificate_id=cert_id,
            verification_url=verification_url,
        )

        # 5. Generate PDF and QR code images using PIL
        CertificateService._generate_certificate_assets(certificate)

        # Notify Student
        from apps.core.notifications import NotificationService

        NotificationService.send_notification(
            user=student,
            title="Certificate Earned!",
            message=f"Congratulations! You have completed '{course.title}' and earned a verifiable certificate. Verification ID: {cert_id}.",
            notification_type="CERTIFICATE_EARNED",
            channels=["in_app", "email"],
        )

        # Award completion XP
        XPService.award_xp(student, 150, f"Completed course: {course.title}")

        return certificate

    @staticmethod
    def _generate_certificate_assets(certificate):
        # Create a beautiful 16:9 certificate background (1920x1080)
        img = Image.new("RGB", (1920, 1080), "#fdfbf7")  # Parchment soft gold/white
        draw = ImageDraw.Draw(img)

        # Draw elegant double border
        # Outer border (dark slate blue)
        draw.rectangle([(40, 40), (1880, 1040)], outline="#0f172a", width=6)
        # Inner border (gold)
        draw.rectangle([(55, 55), (1865, 1025)], outline="#d97706", width=2)

        # Try to load a clean default system font or fallback to default
        try:
            # Arial or Georgia are common across OS
            title_font = ImageFont.truetype("Georgia", 60)
            subtitle_font = ImageFont.truetype("Georgia", 24)
            name_font = ImageFont.truetype("Georgia", 52)
            meta_font = ImageFont.truetype("Arial", 18)
        except Exception:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            name_font = ImageFont.load_default()
            meta_font = ImageFont.load_default()

        # Text Drawing helper to center
        def draw_centered_text(y, text, font, fill="#0f172a"):
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            x = (1920 - text_width) // 2
            draw.text((x, y), text, font=font, fill=fill)

        # Draw logo at top center
        try:
            from django.conf import settings
            import os

            logo_path = os.path.join(settings.BASE_DIR.parent, "docs", "branding", "icon_mark.png")
            if os.path.exists(logo_path):
                logo_img = Image.open(logo_path).resize((80, 80), Image.Resampling.LANCZOS)
                img.paste(logo_img, (920, 65), logo_img.convert("RGBA") if logo_img.mode != "RGBA" else None)
        except Exception:
            pass  # Draw content
        draw_centered_text(160, "CERTIFICATE OF COMPLETION", title_font, fill="#d97706")
        draw_centered_text(250, "SkillSphere Educational Academy", subtitle_font, fill="#475569")

        draw_centered_text(380, "This is proudly presented to", subtitle_font, fill="#64748b")

        student_name = (
            f"{certificate.student.first_name} {certificate.student.last_name}".strip() or certificate.student.username
        )
        draw_centered_text(450, student_name.upper(), name_font, fill="#0f172a")

        draw_centered_text(
            580, "for successfully completing all requirements for the course", subtitle_font, fill="#64748b"
        )
        draw_centered_text(650, f'"{certificate.course.title}"', name_font, fill="#1e3a8a")

        # Instructor & Date signatures
        instructor_name = (
            f"{certificate.course.instructor.first_name} {certificate.course.instructor.last_name}".strip()
            or certificate.course.instructor.username
        )
        date_str = timezone.now().strftime("%B %d, %Y")

        # Draw columns for signatures
        draw.line([(300, 850), (700, 850)], fill="#94a3b8", width=2)
        draw.text((320, 860), f"Instructor: {instructor_name}", font=subtitle_font, fill="#0f172a")

        draw.line([(1220, 850), (1620, 850)], fill="#94a3b8", width=2)
        draw.text((1240, 860), f"Issued Date: {date_str}", font=subtitle_font, fill="#0f172a")

        # ID info
        draw.text((80, 950), f"Certificate ID: {certificate.certificate_id}", font=meta_font, fill="#94a3b8")
        draw.text((80, 980), f"Verify Authenticity at: {certificate.verification_url}", font=meta_font, fill="#94a3b8")

        # Try to download and paste the QR code
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=130x130&data={urllib.parse.quote(certificate.verification_url)}"
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            req = urllib.request.Request(qr_url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                qr_bytes = response.read()
                qr_image = Image.open(io.BytesIO(qr_bytes))

                # Save QR Code to model field
                qr_io = io.BytesIO()
                qr_image.save(qr_io, format="PNG")
                certificate.qr_code_image.save(
                    f"{certificate.certificate_id}_qr.png", ContentFile(qr_io.getvalue()), save=False
                )

                # Paste QR code onto certificate canvas (bottom middle)
                img.paste(qr_image, (895, 820))
        except Exception as e:
            # Fallback placeholder if offline / failed
            draw.rectangle([(895, 820), (1025, 950)], fill="#e2e8f0", outline="#94a3b8")
            draw.text((915, 875), "QR CODE", font=meta_font, fill="#64748b")

        # Save the certificate as PDF
        pdf_io = io.BytesIO()
        img.save(pdf_io, format="PDF")
        certificate.pdf_file.save(f"{certificate.certificate_id}.pdf", ContentFile(pdf_io.getvalue()), save=True)
