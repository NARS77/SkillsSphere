from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Category
from apps.curriculum.models import Lesson
from apps.reviews.models import Review
from apps.certificates.models import Certificate

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely deletes demo content, resets database state, triggers seed_demo, and verifies the seeded environment.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("=== Starting Demo Reset Workflow ==="))

        # 1. Truncate demo accounts and catalog data (dependent models are cascade-deleted)
        self.stdout.write("Deleting existing demo accounts and categories...")
        user_delete_info = User.objects.filter(email__endswith='@skillsphere.demo').delete()
        self.stdout.write(f"Deleted user records and cascades: {user_delete_info}")

        category_delete_info = Category.objects.all().delete()
        self.stdout.write(f"Deleted categories and cascades: {category_delete_info}")

        # 2. Trigger seed_demo command
        self.stdout.write(self.style.WARNING("Running seed_demo to rebuild the environment..."))
        call_command('seed_demo')

        # 3. Verify seeded data counts
        self.stdout.write(self.style.WARNING("Verifying database seeded integrity..."))
        
        students_count = User.objects.filter(role='STUDENT', email__endswith='@skillsphere.demo').count()
        instructors_count = User.objects.filter(role='INSTRUCTOR', email__endswith='@skillsphere.demo').count()
        courses_count = Course.objects.all().count()
        lessons_count = Lesson.objects.all().count()
        reviews_count = Review.objects.all().count()
        certificates_count = Certificate.objects.all().count()

        self.stdout.write(f"Seeded Students: {students_count} (Expected: >=100)")
        self.stdout.write(f"Seeded Instructors: {instructors_count} (Expected: >=10)")
        self.stdout.write(f"Seeded Courses: {courses_count} (Expected: >=20)")
        self.stdout.write(f"Seeded Lessons: {lessons_count} (Expected: >=150)")
        self.stdout.write(f"Seeded Reviews: {reviews_count} (Expected: >=150)")
        self.stdout.write(f"Seeded Certificates: {certificates_count} (Expected: >=50)")

        # Integrity validations
        assert students_count >= 100, f"Integrity check failed: only {students_count} students seeded!"
        assert instructors_count >= 10, f"Integrity check failed: only {instructors_count} instructors seeded!"
        assert courses_count >= 20, f"Integrity check failed: only {courses_count} courses seeded!"
        assert lessons_count >= 150, f"Integrity check failed: only {lessons_count} lessons seeded!"
        assert reviews_count >= 150, f"Integrity check failed: only {reviews_count} reviews seeded!"
        assert certificates_count >= 50, f"Integrity check failed: only {certificates_count} certificates seeded!"

        self.stdout.write(self.style.SUCCESS("=== Demo environment successfully verified and ready for public use ==="))
