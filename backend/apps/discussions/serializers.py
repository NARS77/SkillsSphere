from rest_framework import serializers
from .models import DiscussionThread, DiscussionReply


class DiscussionReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)
    vote_count = serializers.IntegerField(source="votes.count", read_only=True)

    class Meta:
        model = DiscussionReply
        fields = ["id", "thread", "author", "author_name", "content", "is_accepted", "vote_count", "created_at"]
        read_only_fields = ["author", "is_accepted"]


class DiscussionThreadSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)
    vote_count = serializers.IntegerField(source="votes.count", read_only=True)
    replies_count = serializers.IntegerField(source="replies.count", read_only=True)

    class Meta:
        model = DiscussionThread
        fields = [
            "id",
            "course",
            "author",
            "author_name",
            "title",
            "content",
            "is_pinned",
            "is_locked",
            "vote_count",
            "replies_count",
            "created_at",
        ]
        read_only_fields = ["author", "is_pinned", "is_locked"]


class DiscussionThreadDetailSerializer(DiscussionThreadSerializer):
    replies = DiscussionReplySerializer(many=True, read_only=True)

    class Meta(DiscussionThreadSerializer.Meta):
        fields = DiscussionThreadSerializer.Meta.fields + ["replies"]
