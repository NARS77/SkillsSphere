from typing import Dict, Any, Optional
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from apps.core.exceptions import ValidationException, NotFoundException, AuthorizationException, DomainException
from .repositories import CategoryRepository, CourseRepository
from .models import Category, Course

User = get_user_model()

class CategoryService:
    """
    Service for coordinating Category operations.
    """
    def __init__(self):
        self.category_repo = CategoryRepository()

    def list_categories(self, with_counts: bool = False):
        from apps.core.cache import CacheService
        cache_key = f"categories:list:counts={with_counts}"
        cached_data = CacheService.get(cache_key)
        if cached_data is not None:
            return cached_data

        if with_counts:
            result = list(self.category_repo.get_categories_with_course_counts())
        else:
            result = list(self.category_repo.get_all_ordered())
        
        CacheService.set(cache_key, result, timeout=3600, tags=['categories'])
        return result

    def create_category(self, data: Dict[str, Any]) -> Category:
        name = data.get('name', '').strip()
        if self.category_repo.filter(name__iexact=name).exists():
            raise ValidationException("Category with this name already exists.")
        category = self.category_repo.create(**data)
        from apps.core.cache import CacheService
        CacheService.invalidate_tag('categories')
        return category

    def update_category(self, category_id: str, data: Dict[str, Any]) -> Category:
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise NotFoundException("Category not found.")
        
        name = data.get('name', '').strip()
        if name and name.lower() != category.name.lower():
            if self.category_repo.filter(name__iexact=name).exists():
                raise ValidationException("Category with this name already exists.")
                
        updated_category = self.category_repo.update(category, **data)
        from apps.core.cache import CacheService
        CacheService.invalidate_tag('categories')
        return updated_category

    def delete_category(self, category_id: str) -> None:
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise NotFoundException("Category not found.")
        self.category_repo.delete(category)
        from apps.core.cache import CacheService
        CacheService.invalidate_tag('categories')


class CourseService:
    """
    Service for coordinating Course operations, including the step-by-step creation wizard,
    publishing workflows, ownership validation, and duplication.
    """
    def __init__(self, course_repo=None, category_repo=None):
        self.course_repo = course_repo or CourseRepository()
        self.category_repo = category_repo or CategoryRepository()

    def _verify_ownership(self, course: Course, user: User) -> None:
        """
        Raises AuthorizationException if the user is not the instructor of the course
        and is not an admin.
        """
        if not user.is_administrator and course.instructor_id != user.id:
            raise AuthorizationException("You do not have permission to modify this course.")

    def create_draft(self, instructor: User, data: Dict[str, Any]) -> Course:
        """
        Creates a new course in DRAFT status.
        """
        category_id = data.pop('category_id', None)
        category = None
        if category_id:
            category = self.category_repo.get_by_id(category_id)
            if not category:
                raise ValidationException("Selected category does not exist.")

        course = self.course_repo.model(
            instructor=instructor,
            category=category,
            status=Course.Status.DRAFT,
            **data
        )
        self.course_repo.save(course)
        return course

    def update_course(self, course_id: str, user: User, data: Dict[str, Any]) -> Course:
        """
        Updates an existing course, checking ownership permissions.
        """
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException("Course not found.")
        
        self._verify_ownership(course, user)

        category_id = data.pop('category_id', None)
        if category_id:
            category = self.category_repo.get_by_id(category_id)
            if not category:
                raise ValidationException("Selected category does not exist.")
            course.category = category
        elif category_id == '':
            course.category = None

        # Update all other fields
        for field, value in data.items():
            setattr(course, field, value)
            
        self.course_repo.save(course)
        return course

    def publish_course(self, course_id: str, user: User) -> Course:
        """
        Transitions course status to PUBLISHED. Validates that required fields are present
        to ensure course content quality.
        """
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException("Course not found.")
            
        self._verify_ownership(course, user)

        # Validation checks for publication
        errors = {}
        if not course.title.strip():
            errors['title'] = "Course must have a title to be published."
        if not course.short_description.strip():
            errors['short_description'] = "Course must have a short description."
        if not course.description.strip():
            errors['description'] = "Course must have a detailed description."
        if not course.category:
            errors['category'] = "Course must belong to a category."
        if course.duration <= 0:
            errors['duration'] = "Course duration must be greater than 0 hours."
        if not course.learning_outcomes or len(course.learning_outcomes) == 0:
            errors['learning_outcomes'] = "Course must have at least one learning outcome."

        if errors:
            raise ValidationException("Cannot publish course. Please resolve constraints.", errors=errors)

        course.status = Course.Status.PUBLISHED
        self.course_repo.save(course)
        return course

    def archive_course(self, course_id: str, user: User) -> Course:
        """
        Archives a course, making it invisible to the public directory.
        """
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException("Course not found.")
            
        self._verify_ownership(course, user)
        course.status = Course.Status.ARCHIVED
        self.course_repo.save(course)
        return course

    def duplicate_course(self, course_id: str, user: User) -> Course:
        """
        Clones an existing course as a new draft, checking ownership.
        """
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException("Course not found.")
            
        self._verify_ownership(course, user)

        # Create duplicate instance
        duplicated_course = Course(
            title=f"Copy of {course.title}",
            short_description=course.short_description,
            description=course.description,
            thumbnail=course.thumbnail,
            banner=course.banner,
            category=course.category,
            instructor=user,
            difficulty=course.difficulty,
            language=course.language,
            duration=course.duration,
            price=course.price,
            discount_price=course.discount_price,
            status=Course.Status.DRAFT,
            visibility=course.visibility,
            tags=course.tags,
            prerequisites=course.prerequisites,
            learning_outcomes=course.learning_outcomes
        )
        self.course_repo.save(duplicated_course)
        return duplicated_course

    def delete_draft(self, course_id: str, user: User) -> None:
        """
        Deletes a course. Only allowed for courses in DRAFT status.
        Published or Archived courses must be archived and can't be deleted this way to protect user enrollments.
        """
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundException("Course not found.")
            
        self._verify_ownership(course, user)

        if course.status != Course.Status.DRAFT:
            raise DomainException("Only draft courses can be permanently deleted. Published or archived courses cannot be deleted to preserve student enrolment logs.")

        self.course_repo.delete(course)
