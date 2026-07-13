from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from .services import MessagingService

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Conversation.objects.filter(Q(student=user) | Q(instructor=user))
        if user.role == 'INSTRUCTOR':
            qs = qs.filter(is_archived_by_instructor=False)
        else:
            qs = qs.filter(is_archived_by_student=False)
        return qs

    def perform_create(self, serializer):
        instructor_id = serializer.validated_data['instructor'].id
        conversation = MessagingService.get_or_create_conversation(self.request.user, instructor_id)
        serializer.instance = conversation

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        MessagingService.mark_as_read(request.user, pk)
        return Response({'message': 'Conversation marked as read.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        archive_status = request.data.get('archive', True)
        MessagingService.archive_conversation(request.user, pk, archive_status)
        return Response({'message': 'Conversation archived.'}, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    def get_queryset(self):
        # Users can only retrieve messages for conversations they participate in
        user = self.request.user
        conversation_id = self.request.query_params.get('conversation')
        
        qs = Message.objects.filter(
            Q(conversation__student=user) | Q(conversation__instructor=user)
        )
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return qs

    def perform_create(self, serializer):
        conversation_id = serializer.validated_data['conversation'].id
        content = serializer.validated_data['content']
        attachment = self.request.FILES.get('attachment')
        
        msg = MessagingService.send_message(self.request.user, conversation_id, content, attachment)
        serializer.instance = msg
