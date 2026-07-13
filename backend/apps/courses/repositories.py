from typing import List, Optional, Dict, Any
from django.db import models
from django.db.models import Count, Q
from apps.core.repositories import BaseRepository
from .models import Category, Course

class CategoryRepository(BaseRepository[Category]):
    """
    Repository for managing Category queries and database operations.
    """
    def __init__(self):
        super().__init__(Category)

    def get_all_ordered(self) -> List[Category]:
        return list(self.model.objects.all().order_by('order', 'name'))

    def get_categories_with_course_counts(self) -> models.QuerySet:
        """
        Returns categories annotated with the number of published courses in each.
        """
        return self.model.objects.annotate(
            course_count=Count(
                'courses',
                filter=Q(courses__status=Course.Status.PUBLISHED, courses__visibility=Course.Visibility.PUBLIC)
            )
        ).order_by('order', 'name')

    def get_by_slug(self, slug: str) -> Optional[Category]:
        try:
            return self.model.objects.get(slug=slug)
        except self.model.DoesNotExist:
            return None


class CourseRepository(BaseRepository[Course]):
    """
    Repository for managing Course queries, filtering, and database operations.
    """
    def __init__(self):
        super().__init__(Course)

    def get_by_slug(self, slug: str) -> Optional[Course]:
        try:
            return self.model.objects.get(slug=slug)
        except self.model.DoesNotExist:
            return None

    def get_instructor_courses(self, instructor_id: Any) -> models.QuerySet:
        """
        Retrieves all courses created by a specific instructor.
        """
        return self.model.objects.select_related('category', 'instructor').filter(instructor_id=instructor_id).order_by('-created_at')

    def get_published_courses(
        self,
        filters: Optional[Dict[str, Any]] = None,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None
    ) -> models.QuerySet:
        """
        Fetches and filters publicly visible, published courses.
        """
        queryset = self.model.objects.select_related('category', 'instructor').filter(
            status=Course.Status.PUBLISHED,
            visibility=Course.Visibility.PUBLIC
        )

        # Apply Filters
        if filters:
            category_slug = filters.get('category')
            if category_slug:
                queryset = queryset.filter(category__slug=category_slug)

            difficulty = filters.get('difficulty')
            if difficulty:
                queryset = queryset.filter(difficulty=difficulty)

            min_price = filters.get('min_price')
            if min_price is not None:
                queryset = queryset.filter(price__gte=min_price)

            max_price = filters.get('max_price')
            if max_price is not None:
                queryset = queryset.filter(price__lte=max_price)

            language = filters.get('language')
            if language:
                queryset = queryset.filter(language__iexact=language)

        # Apply Text Search (title, description, short_description)
        if search_query:
            search_terms = search_query.strip().split()
            q_objects = Q()
            for term in search_terms:
                q_objects |= Q(title__icontains=term) | \
                             Q(short_description__icontains=term) | \
                             Q(description__icontains=term)
            queryset = queryset.filter(q_objects)

        # Apply Sorting
        if sort_by:
            sort_mapping = {
                'newest': '-created_at',
                'oldest': 'created_at',
                'price_asc': 'price',
                'price_desc': '-price',
                'title_asc': 'title',
                'title_desc': '-title',
            }
            order_field = sort_mapping.get(sort_by, '-created_at')
            queryset = queryset.order_by(order_field)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset
