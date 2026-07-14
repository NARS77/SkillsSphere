from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Course

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "icon", "color", "order")
        read_only_fields = ("id", "slug")


class CategoryWithCountSerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "icon", "color", "order", "course_count")
        read_only_fields = ("id", "slug", "course_count")


class CourseInstructorSerializer(serializers.ModelSerializer):
    headline = serializers.CharField(source="profile.headline", read_only=True, default="")
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "headline", "avatar")


class CourseListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    instructor = CourseInstructorSerializer(read_only=True)
    students_count = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "thumbnail",
            "category",
            "instructor",
            "difficulty",
            "language",
            "duration",
            "price",
            "discount_price",
            "status",
            "students_count",
            "rating",
            "reviews_count",
            "created_at",
        )

    def get_students_count(self, obj) -> int:
        return obj.enrollments.filter(is_active=True).count()

    def get_rating(self, obj) -> float:
        from apps.reviews.models import Review
        from django.db.models import Avg

        avg = Review.objects.filter(course=obj, is_hidden=False).aggregate(avg=Avg("rating"))["avg"]
        return round(float(avg), 1) if avg is not None else 5.0

    def get_reviews_count(self, obj) -> int:
        from apps.reviews.models import Review

        return Review.objects.filter(course=obj, is_hidden=False).count()


class CourseDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    instructor = CourseInstructorSerializer(read_only=True)
    students_count = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    rating_distribution = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "thumbnail",
            "banner",
            "category",
            "instructor",
            "difficulty",
            "language",
            "duration",
            "price",
            "discount_price",
            "status",
            "visibility",
            "tags",
            "prerequisites",
            "learning_outcomes",
            "students_count",
            "rating",
            "reviews_count",
            "rating_distribution",
            "is_enrolled",
            "progress_percent",
            "created_at",
            "updated_at",
        )

    def get_progress_percent(self, obj) -> int:
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            enrollment = obj.enrollments.filter(student=request.user, is_active=True).first()
            if enrollment:
                # Count total section lessons
                from apps.curriculum.models import Lesson

                total_lessons = Lesson.objects.filter(section__course=obj, status="PUBLISHED").count()
                if total_lessons == 0:
                    return 0
                completed_lessons = request.user.progress_records.filter(course=obj, is_completed=True).count()
                return int((completed_lessons / total_lessons) * 100)
        return 0

    def get_students_count(self, obj) -> int:
        return obj.enrollments.filter(is_active=True).count()

    def get_rating(self, obj) -> float:
        from apps.reviews.models import Review
        from django.db.models import Avg

        avg = Review.objects.filter(course=obj, is_hidden=False).aggregate(avg=Avg("rating"))["avg"]
        return round(float(avg), 1) if avg is not None else 5.0

    def get_reviews_count(self, obj) -> int:
        from apps.reviews.models import Review

        return Review.objects.filter(course=obj, is_hidden=False).count()

    def get_rating_distribution(self, obj) -> dict:
        from apps.reviews.models import Review
        from django.db.models import Count

        dist = Review.objects.filter(course=obj, is_hidden=False).values("rating").annotate(count=Count("id"))
        result = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for item in dist:
            r = item["rating"]
            if r in result:
                result[r] = item["count"]
        return result

    def get_is_enrolled(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return obj.enrollments.filter(student=request.user, is_active=True).exists()
        return False


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    category_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Course
        fields = (
            "title",
            "short_description",
            "description",
            "thumbnail",
            "banner",
            "category_id",
            "difficulty",
            "language",
            "duration",
            "price",
            "discount_price",
            "visibility",
            "tags",
            "prerequisites",
            "learning_outcomes",
        )

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_discount_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Discount price cannot be negative.")
        return value

    def validate(self, data):
        price = data.get("price")
        discount_price = data.get("discount_price")

        if price is not None and discount_price is not None:
            if discount_price > price:
                raise serializers.ValidationError(
                    {"discount_price": "Discount price cannot be greater than the original price."}
                )
        return data
