from django.db import models
from django.conf import settings
from apps.core.models import BaseBusinessModel

class DiscussionThread(BaseBusinessModel):
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='discussion_threads'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_threads'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.title} by {self.author.username}"


class DiscussionReply(BaseBusinessModel):
    thread = models.ForeignKey(
        DiscussionThread,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_replies'
    )
    content = models.TextField()
    is_accepted = models.BooleanField(default=False)

    class Meta:
        ordering = ['is_accepted', 'created_at']

    def __str__(self):
        return f"Reply by {self.author.username} on thread {self.thread.id}"


class ThreadVote(BaseBusinessModel):
    thread = models.ForeignKey(
        DiscussionThread,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='thread_votes'
    )

    class Meta:
        unique_together = ('thread', 'user')


class ReplyVote(BaseBusinessModel):
    reply = models.ForeignKey(
        DiscussionReply,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reply_votes'
    )

    class Meta:
        unique_together = ('reply', 'user')
