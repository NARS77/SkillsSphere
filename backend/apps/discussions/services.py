from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from apps.courses.models import Course
from apps.core.models import Notification
from .models import DiscussionThread, DiscussionReply, ThreadVote, ReplyVote

class DiscussionService:
    @staticmethod
    def create_thread(course_id, author, title, content):
        course = get_object_or_404(Course, id=course_id)
        thread = DiscussionThread.objects.create(
            course=course,
            author=author,
            title=title,
            content=content
        )
        
        # Notify instructor
        if course.instructor != author:
            Notification.objects.create(
                user=course.instructor,
                title="New Discussion Thread",
                message=f"{author.username} started a discussion: '{title}' in {course.title}.",
                notification_type="NEW_DISCUSSION"
            )
        return thread

    @staticmethod
    def add_reply(thread_id, author, content):
        thread = get_object_or_404(DiscussionThread, id=thread_id)
        if thread.is_locked:
            raise ValidationException("This thread is locked and cannot receive replies.")

        reply = DiscussionReply.objects.create(
            thread=thread,
            author=author,
            content=content
        )
        
        # Notify thread author
        if thread.author != author:
            Notification.objects.create(
                user=thread.author,
                title="New Reply to Discussion",
                message=f"{author.username} replied to your thread: '{thread.title}'.",
                notification_type="DISCUSSION_REPLY"
            )
        return reply

    @staticmethod
    def toggle_vote_thread(user, thread_id):
        thread = get_object_or_404(DiscussionThread, id=thread_id)
        vote_qs = ThreadVote.objects.filter(thread=thread, user=user)
        if vote_qs.exists():
            vote_qs.delete()
            return False
        else:
            ThreadVote.objects.create(thread=thread, user=user)
            return True

    @staticmethod
    def toggle_vote_reply(user, reply_id):
        reply = get_object_or_404(DiscussionReply, id=reply_id)
        vote_qs = ReplyVote.objects.filter(reply=reply, user=user)
        if vote_qs.exists():
            vote_qs.delete()
            return False
        else:
            ReplyVote.objects.create(reply=reply, user=user)
            return True

    @staticmethod
    def accept_reply(instructor, reply_id, accept_status=True):
        reply = get_object_or_404(DiscussionReply, id=reply_id)
        if reply.thread.course.instructor != instructor:
            raise ValidationException("Only the course instructor can accept answers on this thread.")
        reply.is_accepted = accept_status
        reply.save()
        return reply

    @staticmethod
    def pin_thread(instructor, thread_id, pin_status=True):
        thread = get_object_or_404(DiscussionThread, id=thread_id)
        if thread.course.instructor != instructor:
            raise ValidationException("Only the course instructor can pin this thread.")
        thread.is_pinned = pin_status
        thread.save()
        return thread

    @staticmethod
    def lock_thread(instructor, thread_id, lock_status=True):
        thread = get_object_or_404(DiscussionThread, id=thread_id)
        if thread.course.instructor != instructor:
            raise ValidationException("Only the course instructor can lock this thread.")
        thread.is_locked = lock_status
        thread.save()
        return thread
