from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from apps.core.exceptions import ValidationException, NotFoundException, AuthorizationException
from apps.authentication.permissions import IsInstructor, IsAdministrator
from .models import Category, Course
from .serializers import (
    CategorySerializer,
    CategoryWithCountSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    CourseCreateUpdateSerializer
)
from .services import CategoryService, CourseService
from .repositories import CourseRepository
from .permissions import IsInstructorOfCourse
from apps.enrollments.models import WatchHistory

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 50


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_administrator
        )


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category CRUD. Read-only for public, modifications restricted to Admins.
    """
    queryset = Category.objects.all()
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None

    def get_serializer_class(self):
        # Annotate counts if requested
        if self.request.query_params.get('with_counts') == 'true':
            return CategoryWithCountSerializer
        return CategorySerializer

    def get_queryset(self):
        if self.request.query_params.get('with_counts') == 'true':
            service = CategoryService()
            return service.list_categories(with_counts=True)
        return super().get_queryset()


class PublicCourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for public catalog browsing. Implements search, filtering, and sorting.
    """
    serializer_class = CourseListSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'slug'

    def get_queryset(self):
        # Extract filters
        filters = {}
        category = self.request.query_params.get('category')
        if category:
            filters['category'] = category

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            filters['difficulty'] = difficulty

        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                filters['min_price'] = float(min_price)
            except ValueError:
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                filters['max_price'] = float(max_price)
            except ValueError:
                pass

        search_query = self.request.query_params.get('search')
        sort_by = self.request.query_params.get('sort_by')

        repo = CourseRepository()
        return repo.get_published_courses(
            filters=filters,
            search_query=search_query,
            sort_by=sort_by
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieves detailed information for a course.
        Supports viewing drafts ONLY if the requester is the course instructor or an administrator.
        """
        slug = self.kwargs.get('slug')
        repo = CourseRepository()
        course = repo.get_by_slug(slug)
        if not course:
            try:
                import uuid
                uuid.UUID(slug)
                course = repo.get_by_id(slug)
            except (ValueError, TypeError):
                pass
        
        if not course:
            raise NotFoundException("Course not found.")

        # If course is not published, enforce ownership checks
        if course.status != Course.Status.PUBLISHED:
            if not request.user or not request.user.is_authenticated:
                raise AuthorizationException("You do not have permission to view this draft course.")
            
            # Check ownership using the service helper
            service = CourseService()
            try:
                service._verify_ownership(course, request.user)
            except AuthorizationException:
                raise AuthorizationException("You do not have permission to view this draft course.")

        serializer = CourseDetailSerializer(course, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """
        Returns top 10 trending courses based on total enrollment count.
        """
        from django.db.models import Count
        trending_courses = Course.objects.filter(status=Course.Status.PUBLISHED).annotate(
            enrollment_count=Count('enrollments')
        ).order_by('-enrollment_count')[:10]
        serializer = CourseListSerializer(trending_courses, many=True, context={'request': request})
        return Response(serializer.data)


class InstructorCourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for instructors to manage their courses.
    """
    permission_classes = (permissions.IsAuthenticated, IsInstructor, IsInstructorOfCourse)
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        if self.action == 'list':
            repo = CourseRepository()
            return repo.get_instructor_courses(self.request.user.id)
        return Course.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CourseCreateUpdateSerializer
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
        
        service = CourseService()
        course = service.create_draft(request.user, serializer.validated_data)
        
        return Response(
            CourseDetailSerializer(course).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer_class()(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
        
        service = CourseService()
        course = service.update_course(instance.id, request.user, serializer.validated_data)
        
        return Response(CourseDetailSerializer(course).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        service = CourseService()
        service.delete_draft(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        instance = self.get_object()
        service = CourseService()
        course = service.publish_course(instance.id, request.user)
        return Response(CourseDetailSerializer(course).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        instance = self.get_object()
        service = CourseService()
        course = service.archive_course(instance.id, request.user)
        return Response(CourseDetailSerializer(course).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        instance = self.get_object()
        service = CourseService()
        course = service.duplicate_course(instance.id, request.user)
        return Response(CourseDetailSerializer(course).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        course = self.get_object()
        enrollments = course.enrollments.all().select_related('student')
        
        # Calculate progress stats per student in-memory
        total_lessons = course.sections.prefetch_related('lessons').values_list('lessons__id', flat=True).filter(lessons__status='PUBLISHED').count()
        
        roster = []
        for enroll in enrollments:
            student = enroll.student
            completed_count = student.progress_records.filter(course_id=course.id, is_completed=True, lesson__status='PUBLISHED').count()
            progress_percent = round((completed_count / total_lessons * 100), 1) if total_lessons > 0 else 0.0
            
            roster.append({
                'id': str(student.id),
                'username': student.username,
                'email': student.email,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'enrolled_at': enroll.created_at,
                'completed_at': enroll.completed_at,
                'unregistered_at': enroll.unregistered_at,
                'is_active': enroll.is_active,
                'progress_percent': progress_percent
            })
            
        return Response(roster)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        from django.db.models import Sum, Count
        course = self.get_object()
        
        # 1. Active learners count
        active_learners = course.enrollments.filter(is_active=True).count()
        
        # 2. Average completion rate
        total_lessons = course.sections.prefetch_related('lessons').values_list('lessons__id', flat=True).filter(lessons__status='PUBLISHED').count()
        enrollments = course.enrollments.all()
        completion_percentages = []
        for enroll in enrollments:
            completed_count = enroll.student.progress_records.filter(course_id=course.id, is_completed=True, lesson__status='PUBLISHED').count()
            progress_percent = (completed_count / total_lessons * 100) if total_lessons > 0 else 0.0
            completion_percentages.append(progress_percent)
            
        avg_completion = round(sum(completion_percentages) / len(completion_percentages), 1) if completion_percentages else 0.0
        
        # 3. Most watched lesson
        lesson_ids = course.sections.prefetch_related('lessons').values_list('lessons__id', flat=True)
        most_watched = WatchHistory.objects.filter(lesson_id__in=lesson_ids).values('lesson__title').annotate(total_time=Sum('watch_time')).order_by('-total_time').first()
        most_watched_title = most_watched['lesson__title'] if most_watched else "None"
        
        # 4. Drop-off lesson
        drop_off = WatchHistory.objects.filter(
            lesson_id__in=lesson_ids,
            completion_percentage__lt=90.0
        ).values('lesson__title').annotate(count=Count('id')).order_by('-count').first()
        drop_off_title = drop_off['lesson__title'] if drop_off else "None"
        
        return Response({
            'active_learners': active_learners,
            'average_completion': avg_completion,
            'most_watched_lesson': most_watched_title,
            'drop_off_lesson': drop_off_title
        })
