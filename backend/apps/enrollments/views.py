from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.core.exceptions import ValidationException, NotFoundException, AuthorizationException
from apps.courses.models import Course
from apps.courses.serializers import CourseListSerializer, CourseDetailSerializer
from apps.curriculum.models import Section, Lesson
from apps.curriculum.serializers import SectionSerializer, LessonSerializer
from .models import Enrollment, UserProgress, WatchHistory, Bookmark
from .serializers import EnrollmentSerializer, UserProgressSerializer, WatchHistorySerializer, BookmarkSerializer
from .services import EnrollmentService, LearningProgressService

class EnrollmentViewSet(viewsets.ViewSet):
    """
    ViewSet for students to enroll, unenroll, and view their active courses.
    """
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll(self, request, pk=None):
        service = EnrollmentService()
        enrollment = service.enroll_student(request.user, pk)
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='unenroll')
    def unenroll(self, request, pk=None):
        service = EnrollmentService()
        service.unenroll_student(request.user, pk)
        return Response({'message': 'Successfully unenrolled from the course.'})

    @action(detail=True, methods=['post'], url_path='resume')
    def resume(self, request, pk=None):
        service = EnrollmentService()
        enrollment = service.resume_student(request.user, pk)
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=False, methods=['get'], url_path='my-courses')
    def my_courses(self, request):
        service = EnrollmentService()
        courses = service.get_enrolled_courses(request.user)
        return Response(CourseListSerializer(courses, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-history')
    def my_history(self, request):
        service = EnrollmentService()
        enrollments = service.get_enrollment_history(request.user)
        return Response(EnrollmentSerializer(enrollments, many=True).data)


class LearningProgressViewSet(viewsets.ViewSet):
    """
    ViewSet for students to track their course completions, video positions, and dashboard statistics.
    """
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        is_completed = request.data.get('is_completed', True)
        if not isinstance(is_completed, bool):
            raise ValidationException("is_completed must be a boolean.")

        service = LearningProgressService()
        progress = service.toggle_lesson_completion(request.user, pk, is_completed)
        return Response(UserProgressSerializer(progress).data)

    @action(detail=True, methods=['post'], url_path='position')
    def position(self, request, pk=None):
        seconds = request.data.get('seconds')
        device = request.data.get('device', 'Web Browser')
        watch_time = request.data.get('watch_time', 0)
        
        if seconds is None:
            raise ValidationException("seconds is a required field.")
        try:
            seconds_int = int(seconds)
            watch_time_int = int(watch_time)
        except ValueError:
            raise ValidationException("seconds and watch_time must be integers.")

        service = LearningProgressService()
        history = service.save_watch_position(
            request.user, pk, seconds_int, device=device, watch_time=watch_time_int
        )
        return Response(WatchHistorySerializer(history).data)

    @action(detail=True, methods=['get'], url_path='course-progress')
    def course_progress(self, request, pk=None):
        service = LearningProgressService()
        stats = service.get_course_progress_stats(request.user, pk)
        return Response(stats)

    @action(detail=False, methods=['get'], url_path='continue')
    def continue_learning(self, request):
        service = LearningProgressService()
        recent = service.get_recently_watched_courses(request.user)
        return Response(recent)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        service = LearningProgressService()
        stats_data = service.get_learning_statistics(request.user)
        return Response(stats_data)

    @action(detail=False, methods=['post'], url_path='bookmarks/toggle')
    def toggle_bookmark(self, request):
        lesson_id = request.data.get('lesson_id')
        if not lesson_id:
            raise ValidationException("lesson_id is required.")
        service = LearningProgressService()
        bookmarked = service.toggle_bookmark(request.user, lesson_id)
        return Response({'bookmarked': bookmarked})

    @action(detail=False, methods=['get'], url_path='bookmarks')
    def list_bookmarks(self, request):
        bookmarks = Bookmark.objects.filter(student=request.user).select_related('lesson__section__course')
        data = []
        for b in bookmarks:
            data.append({
                'id': str(b.id),
                'lesson': LessonSerializer(b.lesson).data,
                'course_title': b.lesson.section.course.title,
                'course_slug': b.lesson.section.course.slug,
                'created_at': b.created_at
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='classroom/(?P<slug>[^/.]+)')
    def classroom(self, request, slug=None):
        """
        Custom endpoint pulling the curriculum sections and lessons of a course,
        aggregating them with the active student's completion and watch history status.
        """
        try:
            course = Course.objects.get(slug=slug)
        except Course.DoesNotExist:
            raise NotFoundException("Course not found.")

        # Check if student is enrolled (or is instructor / superuser)
        is_owner = course.instructor_id == request.user.id
        is_admin = request.user.is_superuser or request.user.role == 'ADMIN'
        
        enroll_service = EnrollmentService()
        is_enrolled = enroll_service.is_enrolled(request.user.id, course.id)

        if not is_enrolled and not is_owner and not is_admin:
            raise AuthorizationException("You must be actively enrolled to access this classroom.")

        # Get ordered sections and lessons
        sections = Section.objects.filter(course=course).prefetch_related('lessons__resources')
        
        # Pull student progress records, watch history records, and bookmarks to map in-memory
        progress_map = {
            p.lesson_id: p.is_completed
            for p in UserProgress.objects.filter(student=request.user, course_id=course.id)
        }
        
        # Watch history map (lesson_id -> last_position)
        watch_map = {
            w.lesson_id: w.last_position
            for w in WatchHistory.objects.filter(student=request.user)
        }

        # Bookmarks set
        bookmarks_set = set(
            Bookmark.objects.filter(student=request.user).values_list('lesson_id', flat=True)
        )

        # Build payload
        sections_data = []
        for sec in sections:
            lessons_data = []
            for les in sec.lessons.all():
                les_serialized = LessonSerializer(les).data
                # Inject completion, last watch position, and bookmarked status details
                les_serialized['is_completed'] = progress_map.get(les.id, False)
                les_serialized['last_position'] = watch_map.get(les.id, 0)
                les_serialized['is_bookmarked'] = les.id in bookmarks_set
                lessons_data.append(les_serialized)

            sec_data = SectionSerializer(sec).data
            sec_data['lessons'] = lessons_data
            sections_data.append(sec_data)

        progress_stats = {}
        if is_enrolled:
            progress_service = LearningProgressService()
            progress_stats = progress_service.get_course_progress_stats(request.user, course.id)

        return Response({
            'course': CourseDetailSerializer(course, context={'request': request}).data,
            'sections': sections_data,
            'progress': progress_stats
        })
