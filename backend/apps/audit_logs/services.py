from .models import AuditLog

class AuditLogService:
    @staticmethod
    def log_action(user, action, details=None):
        if details is None:
            details = {}
        # Convert any UUID keys/values in details to strings
        details_cleaned = {}
        for k, v in details.items():
            details_cleaned[str(k)] = str(v)
            
        AuditLog.objects.create(
            actor=user if user and user.is_authenticated else None,
            action=action,
            details=details_cleaned
        )
