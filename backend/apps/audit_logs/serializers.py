from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "actor_name", "action", "ip_address", "details", "timestamp"]
