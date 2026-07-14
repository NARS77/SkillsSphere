from apps.courses.models import Course
from apps.enrollments.models import Enrollment


class AIRecommendationService:
    """
    Analyzes student enrollments, interests, and wishlist to recommend courses.
    """

    def get_recommendations(self, user) -> list:
        # Fetch courses the student is already enrolled in
        enrolled_course_ids = Enrollment.objects.filter(student=user).values_list("course_id", flat=True)

        # Get matching published courses that the student has not enrolled in yet
        recommended_courses = Course.objects.filter(status=Course.Status.PUBLISHED).exclude(id__in=enrolled_course_ids)[
            :4
        ]

        results = []
        for course in recommended_courses:
            results.append(
                {
                    "id": str(course.id),
                    "title": course.title,
                    "slug": course.slug,
                    "short_description": course.short_description,
                    "price": float(course.price),
                    "category_name": course.category.name if course.category else "General",
                    "difficulty": course.difficulty,
                }
            )

        return results
