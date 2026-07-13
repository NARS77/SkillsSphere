from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.core.exceptions import ValidationException, NotFoundException
from apps.authentication.permissions import IsInstructor
from .models import Section, Lesson, LessonResource
from .serializers import (
    SectionSerializer,
    SectionCreateUpdateSerializer,
    LessonSerializer,
    LessonCreateUpdateSerializer,
    LessonResourceSerializer
)
from .services import CurriculumService

class SectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for instructors to manage syllabus sections.
    """
    permission_classes = (permissions.IsAuthenticated, IsInstructor)

    def get_queryset(self):
        # ViewSet needs queryset but we interact via service
        return Section.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionCreateUpdateSerializer
        return SectionSerializer

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        if not course_id:
            raise ValidationException("course_id is required to create a section.")
            
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)

        service = CurriculumService()
        section = service.create_section(
            course_id=course_id,
            title=serializer.validated_data['title'],
            user=request.user
        )
        return Response(SectionSerializer(section).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer_class()(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)

        service = CurriculumService()
        section = service.update_section(
            section_id=instance.id,
            title=serializer.validated_data['title'],
            user=request.user
        )
        return Response(SectionSerializer(section).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        service = CurriculumService()
        service.delete_section(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        course_id = request.data.get('course_id')
        section_ids = request.data.get('section_ids', [])
        
        if not course_id:
            raise ValidationException("course_id is required.")
        if not isinstance(section_ids, list):
            raise ValidationException("section_ids must be a list of UUID strings.")

        service = CurriculumService()
        service.reorder_sections(course_id, section_ids, request.user)
        return Response({'message': 'Sections reordered successfully.'})


class LessonViewSet(viewsets.ModelViewSet):
    """
    ViewSet for instructors to manage syllabus lessons.
    """
    permission_classes = (permissions.IsAuthenticated, IsInstructor)

    def get_queryset(self):
        return Lesson.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LessonCreateUpdateSerializer
        return LessonSerializer

    def create(self, request, *args, **kwargs):
        section_id = request.data.get('section_id')
        if not section_id:
            raise ValidationException("section_id is required to create a lesson.")

        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)

        service = CurriculumService()
        lesson = service.create_lesson(
            section_id=section_id,
            data=serializer.validated_data,
            user=request.user
        )
        return Response(LessonSerializer(lesson).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer_class()(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)

        service = CurriculumService()
        lesson = service.update_lesson(
            lesson_id=instance.id,
            data=serializer.validated_data,
            user=request.user
        )
        return Response(LessonSerializer(lesson).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        service = CurriculumService()
        service.delete_lesson(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        instance = self.get_object()
        service = CurriculumService()
        lesson = service.duplicate_lesson(instance.id, request.user)
        return Response(LessonSerializer(lesson).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        section_id = request.data.get('section_id')
        lesson_ids = request.data.get('lesson_ids', [])

        if not section_id:
            raise ValidationException("section_id is required.")
        if not isinstance(lesson_ids, list):
            raise ValidationException("lesson_ids must be a list of UUID strings.")

        service = CurriculumService()
        service.reorder_lessons(section_id, lesson_ids, request.user)
        return Response({'message': 'Lessons reordered successfully.'})


class LessonResourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for instructors to upload and delete lesson attachments.
    """
    permission_classes = (permissions.IsAuthenticated, IsInstructor)
    serializer_class = LessonResourceSerializer

    def get_queryset(self):
        return LessonResource.objects.all()

    def create(self, request, *args, **kwargs):
        lesson_id = request.data.get('lesson_id')
        title = request.data.get('title')
        file_obj = request.FILES.get('file')

        if not lesson_id or not title or not file_obj:
            raise ValidationException("lesson_id, title, and file are all required fields.")

        service = CurriculumService()
        resource = service.create_resource(
            lesson_id=lesson_id,
            title=title,
            file_obj=file_obj,
            user=request.user
        )
        return Response(LessonResourceSerializer(resource).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        service = CurriculumService()
        service.delete_resource(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
