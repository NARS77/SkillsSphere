from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, serializers
from .models import LoginHistory, User
from apps.core.exceptions import ValidationException


class LoginHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginHistory
        fields = ("id", "ip_address", "user_agent", "created_at")


class LoginHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        history = LoginHistory.objects.filter(user=request.user)[:10]
        serializer = LoginHistorySerializer(history, many=True)
        return Response(serializer.data)


class TwoFactorSetupView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        # Mock generating a TOTP secret
        import secrets

        secret = secrets.token_hex(16)
        request.user.two_factor_secret = secret
        request.user.save()

        return Response(
            {
                "secret": secret,
                "qr_code_mock": f"otpauth://totp/SkillSphere:{request.user.email}?secret={secret}&issuer=SkillSphere",
            }
        )


class TwoFactorVerifyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        code = request.data.get("code")
        if not code:
            raise ValidationException("Verification code is required.")

        # Simulated verification: any 6-digit code works for demonstration
        if len(code) == 6 and code.isdigit():
            request.user.two_factor_enabled = True
            request.user.save()
            return Response({"message": "Two-factor authentication enabled successfully.", "enabled": True})
        else:
            raise ValidationException("Invalid two-factor code. Try any 6-digit numeric code.")


class NotificationPreferencesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        prefs = request.user.notification_preferences or {
            "email_notifications": True,
            "push_notifications": True,
            "weekly_summary": False,
        }
        return Response(prefs)

    def post(self, request):
        prefs = request.user.notification_preferences or {}

        # Merge input data
        for key in ["email_notifications", "push_notifications", "weekly_summary"]:
            if key in request.data:
                prefs[key] = bool(request.data[key])

        request.user.notification_preferences = prefs
        request.user.save()
        return Response(prefs)
