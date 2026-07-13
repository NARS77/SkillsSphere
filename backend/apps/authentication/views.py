from datetime import timedelta
from django.utils import timezone
import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from apps.core.exceptions import ValidationException, NotFoundException
from apps.core.tasks import send_email_task
from apps.core.notifications.templates import render_email_template
from .models import EmailVerificationToken, PasswordResetToken, AccountActivity, User, UserPreference, UserSession
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer
)
from .services import AuthService

def create_session_record(user, refresh_token_str, request):
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        from .models import UserSession
        
        refresh = RefreshToken(refresh_token_str)
        jti = refresh['jti']
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Parse User Agent
        ua = user_agent.lower()
        if 'mobile' in ua:
            device_type = 'Mobile'
        elif 'tablet' in ua or 'ipad' in ua:
            device_type = 'Tablet'
        else:
            device_type = 'Desktop'
            
        browser = 'Unknown'
        for b in ['chrome', 'firefox', 'safari', 'edge', 'opera', 'postman']:
            if b in ua:
                browser = b.capitalize()
                break
                
        UserSession.objects.create(
            user=user,
            refresh_token_jti=jti,
            ip_address=ip,
            user_agent=user_agent,
            browser=browser,
            device_type=device_type,
            country="Localhost" if ip in ['127.0.0.1', '::1'] else "Unknown"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to record session: {e}")


class RegisterView(APIView):
    """
    Initiates user registration by validating inputs and emailing a 6-digit OTP code.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
        
        service = AuthService()
        otp = service.initiate_registration(serializer.validated_data)
        
        return Response({
            'message': 'Verification code sent to email.',
            'email': serializer.validated_data['email']
        }, status=status.HTTP_200_OK)


class RegisterVerifyView(APIView):
    """
    Verifies the 6-digit registration OTP code and creates the verified user in the database.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip()
        code = request.data.get('code', '').strip()

        if not email or not code:
            raise ValidationException("Email and verification code are required.")

        service = AuthService()
        user, tokens = service.complete_registration(email, code)

        create_session_record(user, tokens['refresh'], request)
        AccountActivity.objects.create(
            user=user,
            event_type='REGISTER',
            description="User successfully completed email verification and registered account."
        )

        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Authenticates a user and returns JWT tokens + user profile information.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
        
        service = AuthService()
        user, tokens = service.authenticate_user(serializer.validated_data)
        
        # Log login history
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            from .models import LoginHistory
            LoginHistory.objects.create(user=user, ip_address=ip, user_agent=user_agent)
        except Exception:
            pass

        create_session_record(user, tokens['refresh'], request)
        AccountActivity.objects.create(
            user=user,
            event_type='LOGIN',
            description="User successfully logged in via credentials."
        )

        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logs out the user by blacklisting the provided refresh token.
    """
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            raise ValidationException("Refresh token is required to logout.")
        
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            raise ValidationException("Invalid or already blacklisted refresh token.")


class ProfileView(APIView):
    """
    Retrieves or updates the current authenticated user's profile.
    """
    def get(self, request):
        service = AuthService()
        profile = service.get_profile(request.user.id)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
            
        service = AuthService()
        profile = service.update_profile(request.user, serializer.validated_data)
        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)

    def patch(self, request):
        # Allow partial updates
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            raise ValidationException("Validation failed.", errors=serializer.errors)
            
        service = AuthService()
        profile = service.update_profile(request.user, serializer.validated_data)
        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    """
    Wrapper for SimpleJWT standard refresh token endpoint.
    """
    pass


class EmailVerifyView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        token_str = request.GET.get('token')
        if not token_str:
            raise ValidationException("Verification token is required.")

        from django.core.cache import cache
        # Check if this token corresponds to a pending registration code
        email = cache.get(f"pending_reg_otp_{token_str}")
        if email:
            service = AuthService()
            user, tokens = service.complete_registration(email, token_str)
            return Response({"message": "Email verified successfully.", "email": user.email}, status=status.HTTP_200_OK)

        try:
            token_obj = EmailVerificationToken.objects.get(token=token_str, is_used=False)
        except EmailVerificationToken.DoesNotExist:
            raise ValidationException("Invalid or already used verification token.")

        if token_obj.is_expired():
            raise ValidationException("Verification token has expired. Please request a new one.")

        user = token_obj.user
        if token_obj.token_type == 'REGISTER':
            user.is_verified = True
            user.save()
            
            # Log security activity
            AccountActivity.objects.create(
                user=user,
                event_type='EMAIL_VERIFIED',
                description="User email address successfully verified during registration."
            )
            
            # Trigger Welcome email
            welcome_msg = render_email_template(
                title="Welcome to SkillSphere",
                heading="Email Verified Successfully!",
                body_paragraphs=[
                    f"Hi {user.username},",
                    "Welcome to SkillSphere! Your account is now fully verified and activated.",
                    "Explore our extensive course library, practice code assignments, and learn with our smart AI active tutor."
                ],
                cta_text="Go to Dashboard",
                cta_url="http://localhost:5173/dashboard"
            )
            send_email_task.delay(
                subject="Welcome to SkillSphere!",
                message=f"Hi {user.username},\n\nWelcome to SkillSphere! Your account is verified.",
                recipient_list=[user.email],
                html_message=welcome_msg
            )
        elif token_obj.token_type == 'EMAIL_CHANGE':
            old_email = user.email
            user.email = token_obj.email
            user.is_verified = True
            user.save()
            
            AccountActivity.objects.create(
                user=user,
                event_type='EMAIL_CHANGED',
                description=f"User changed primary email address from {old_email} to {token_obj.email}."
            )

        token_obj.is_used = True
        token_obj.save()

        return Response({"message": "Email verified successfully.", "email": user.email}, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            raise ValidationException("Email is required.")

        from django.core.cache import cache
        pending_data = cache.get(f"pending_reg_email_{email}")
        if pending_data:
            # Generate new 6-digit OTP code
            import secrets
            token = str(secrets.randbelow(900000) + 100000)
            
            # Remove old OTP key
            old_otp = pending_data.get('otp')
            if old_otp:
                cache.delete(f"pending_reg_otp_{old_otp}")
                
            # Update cache keys with new OTP code
            cache.set(f"pending_reg_email_{email}", {**pending_data, 'otp': token}, timeout=900)
            cache.set(f"pending_reg_otp_{token}", email, timeout=900)
            
            # Send the verification email
            from django.conf import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            verify_url = f"{frontend_url}/verify-email?token={token}"

            html_msg = render_email_template(
                title="Verify Your Email - SkillSphere",
                heading="Email Verification Link",
                body_paragraphs=[
                    f"Hi {pending_data['username']},",
                    "Here is your requested email verification code. Please enter it on the registration screen to complete account activation:",
                    f"<div style='font-size: 32px; font-weight: 800; text-align: center; letter-spacing: 5px; color: #863bff; margin: 24px 0; font-family: monospace;'>{token}</div>",
                    "Alternatively, you can verify your email address immediately by clicking the button below.",
                    "This verification code will expire in 15 minutes."
                ],
                cta_text="Verify Email Address",
                cta_url=verify_url
            )
            
            send_email_task.delay(
                subject="Verify Your Email - SkillSphere",
                message=f"Hi {pending_data['username']},\n\nPlease verify your email by entering: {token}\nOr click the link: {verify_url}",
                recipient_list=[email],
                html_message=html_msg
            )

            return Response({"message": "Verification code sent successfully."}, status=status.HTTP_200_OK)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Prevent user enumeration: return success even if user doesn't exist
            return Response({"message": "If this email is registered and unverified, a verification link has been sent."}, status=status.HTTP_200_OK)

        if user.is_verified:
            return Response({"message": "This email is already verified."}, status=status.HTTP_200_OK)

        # Generate verification token (6-digit numeric code)
        import secrets
        token = str(secrets.randbelow(900000) + 100000)
        expires_at = timezone.now() + timedelta(hours=24)
        EmailVerificationToken.objects.create(
            user=user,
            email=email,
            token=token,
            token_type='REGISTER',
            expires_at=expires_at
        )

        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verify_url = f"{frontend_url}/verify-email?token={token}"

        html_msg = render_email_template(
            title="Verify Your Email - SkillSphere",
            heading="Email Verification Link",
            body_paragraphs=[
                f"Hi {user.username},",
                "Here is your requested email verification code. Please enter it on the registration screen to complete account activation:",
                f"<div style='font-size: 32px; font-weight: 800; text-align: center; letter-spacing: 5px; color: #863bff; margin: 24px 0; font-family: monospace;'>{token}</div>",
                "Alternatively, you can verify your email address immediately by clicking the button below.",
                "This verification code will expire in 24 hours."
            ],
            cta_text="Verify Email Address",
            cta_url=verify_url
        )
        
        send_email_task.delay(
            subject="Verify Your Email - SkillSphere",
            message=f"Hi {user.username},\n\nPlease verify your email by entering: {token}\nOr click the link: {verify_url}",
            recipient_list=[user.email],
            html_message=html_msg
        )

        return Response({"message": "Verification code sent successfully."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            raise ValidationException("Email is required.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If this email is registered, a password reset link has been sent."}, status=status.HTTP_200_OK)

        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=2) # expires in 2 hours
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )

        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password?token={token}"

        html_msg = render_email_template(
            title="Reset Your Password - SkillSphere",
            heading="Password Recovery Request",
            body_paragraphs=[
                f"Hi {user.username},",
                "We received a request to reset your password. Click the button below to choose a new password.",
                "This link will expire in 2 hours. If you did not make this request, you can safely ignore this email."
            ],
            cta_text="Reset Password",
            cta_url=reset_url
        )

        send_email_task.delay(
            subject="Reset Your Password - SkillSphere",
            message=f"Hi {user.username},\n\nPlease reset your password by clicking: {reset_url}",
            recipient_list=[user.email],
            html_message=html_msg
        )

        return Response({"message": "Password reset link sent successfully."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token_str = request.data.get('token')
        new_password = request.data.get('password')

        if not token_str or not new_password:
            raise ValidationException("Token and new password are required.")

        try:
            token_obj = PasswordResetToken.objects.get(token=token_str, is_used=False)
        except PasswordResetToken.DoesNotExist:
            raise ValidationException("Invalid or already used password reset token.")

        if token_obj.is_expired():
            raise ValidationException("Password reset token has expired.")

        user = token_obj.user
        
        # Enforce password strength
        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, user)
        except Exception as e:
            raise ValidationException("Password validation failed.", errors={"password": list(e.messages)})

        user.set_password(new_password)
        user.save()

        # Invalidate existing refresh tokens (logout from other devices)
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        outstanding = OutstandingToken.objects.filter(user=user)
        for t in outstanding:
            BlacklistedToken.objects.get_or_create(token=t)

        token_obj.is_used = True
        token_obj.save()

        # Log security activity
        AccountActivity.objects.create(
            user=user,
            event_type='PASSWORD_CHANGED',
            description="User password successfully reset via secure recovery token."
        )

        # Send confirmation email
        html_msg = render_email_template(
            title="Password Changed - SkillSphere",
            heading="Password Changed Successfully!",
            body_paragraphs=[
                f"Hi {user.username},",
                "Your password has been changed successfully. You can now log back into your account using your new credentials.",
                "If you did not perform this change, please contact our support team immediately to secure your account."
            ],
            cta_text="Sign In",
            cta_url="http://localhost:5173/login"
        )
        
        send_email_task.delay(
            subject="Your Password Has Been Changed - SkillSphere",
            message=f"Hi {user.username},\n\nYour password has been successfully changed.",
            recipient_list=[user.email],
            html_message=html_msg
        )

        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)


from rest_framework import serializers
from .models import UserSession

class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ('id', 'ip_address', 'user_agent', 'browser', 'device_type', 'country', 'last_active', 'created_at', 'is_active')


class UserSessionsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True).order_by('-last_active')
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        action = request.data.get('action')
        
        if action == 'revoke':
            session_id = request.data.get('session_id')
            if not session_id:
                raise ValidationException("Session ID is required to revoke.")
                
            try:
                session = UserSession.objects.get(id=session_id, user=request.user, is_active=True)
            except UserSession.DoesNotExist:
                raise NotFoundException("Active session not found.")

            # Blacklist refresh token
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            try:
                token = OutstandingToken.objects.get(jti=session.refresh_token_jti)
                BlacklistedToken.objects.get_or_create(token=token)
            except OutstandingToken.DoesNotExist:
                pass

            session.is_active = False
            session.save()

            AccountActivity.objects.create(
                user=request.user,
                event_type='SESSION_REVOKED',
                description=f"Revoked active device session from IP {session.ip_address}."
            )

            return Response({"message": "Session revoked successfully."}, status=status.HTTP_200_OK)
            
        elif action == 'revoke_all_other':
            current_session_id = request.data.get('current_session_id')
            
            # Find all other active sessions
            sessions = UserSession.objects.filter(user=request.user, is_active=True)
            if current_session_id:
                sessions = sessions.exclude(id=current_session_id)
            else:
                # Fallback: keep the session with matching IP/UserAgent that was updated last
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
                ua = request.META.get('HTTP_USER_AGENT', '')
                matching = sessions.filter(ip_address=ip, user_agent=ua).order_by('-last_active')
                if matching.exists():
                    sessions = sessions.exclude(id=matching.first().id)

            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            revoked_count = 0
            for session in sessions:
                try:
                    token = OutstandingToken.objects.get(jti=session.refresh_token_jti)
                    BlacklistedToken.objects.get_or_create(token=token)
                except OutstandingToken.DoesNotExist:
                    pass
                session.is_active = False
                session.save()
                revoked_count += 1

            AccountActivity.objects.create(
                user=request.user,
                event_type='ALL_OTHER_SESSIONS_REVOKED',
                description=f"Revoked all {revoked_count} other active device sessions."
            )

            return Response({"message": f"Successfully revoked {revoked_count} other sessions."}, status=status.HTTP_200_OK)

        raise ValidationException("Invalid action. Supported: 'revoke', 'revoke_all_other'.")


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        exclude = ('id', 'user')


class UserPreferenceView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(pref)
        return Response(serializer.data)

    def put(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        raise ValidationException("Validation failed.", errors=serializer.errors)

    def patch(self, request):
        return self.put(request)


class AccountDeactivateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        password = request.data.get('password')
        feedback = request.data.get('feedback', '')

        if not password:
            raise ValidationException("Password confirmation is required.")

        user = request.user
        if not user.check_password(password):
            raise ValidationException("Invalid password confirmation.")

        # Soft delete
        user.is_active = False
        user.deleted_at = timezone.now()
        user.deletion_feedback = feedback
        user.save()

        # Invalidate existing refresh tokens (logout from other devices)
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        outstanding = OutstandingToken.objects.filter(user=user)
        for t in outstanding:
            BlacklistedToken.objects.get_or_create(token=t)

        AccountActivity.objects.create(
            user=user,
            event_type='ACCOUNT_DEACTIVATED',
            description="User initiated soft account deletion."
        )

        return Response({"message": "Account deactivated successfully. Your data will be kept for a 30-day retention period before cleanup."}, status=status.HTTP_200_OK)


import json
import zipfile
import io
from django.http import HttpResponse

class DataExportView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        
        # 1. Fetch Profile info
        profile_data = {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "date_joined": user.date_joined.isoformat(),
            "terms_accepted": user.terms_accepted,
            "terms_accepted_at": user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
            "headline": getattr(user.profile, 'headline', ''),
            "bio": getattr(user.profile, 'bio', ''),
            "website_url": getattr(user.profile, 'website_url', ''),
            "linkedin_url": getattr(user.profile, 'linkedin_url', ''),
            "github_url": getattr(user.profile, 'github_url', ''),
            "twitter_url": getattr(user.profile, 'twitter_url', ''),
            "display_name": getattr(user.profile, 'display_name', ''),
            "country": getattr(user.profile, 'country', ''),
            "timezone": getattr(user.profile, 'timezone', ''),
            "preferred_language": getattr(user.profile, 'preferred_language', ''),
            "occupation": getattr(user.profile, 'occupation', ''),
            "xp": getattr(user.profile, 'xp', 0),
            "streak": getattr(user.profile, 'streak', 0)
        }

        # 2. Fetch Enrolled Courses list
        from apps.enrollments.models import Enrollment
        enrollments = Enrollment.objects.filter(student=user)
        courses_data = [{
            "course_title": e.course.title,
            "course_slug": e.course.slug,
            "enrolled_at": e.created_at.isoformat(),
            "is_active": e.is_active,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None
        } for e in enrollments]

        # 3. Fetch Certificates list
        from apps.certificates.models import Certificate
        certificates = Certificate.objects.filter(student=user)
        certs_data = [{
            "certificate_id": c.certificate_id,
            "course_title": c.course.title,
            "issued_at": c.issued_at.isoformat()
        } for c in certificates]

        # 4. Fetch Notes
        notes_data = []

        # 5. Fetch Quiz History
        from apps.quizzes.models import QuizAttempt
        quiz_attempts = QuizAttempt.objects.filter(student=user)
        quizzes_data = [{
            "quiz_title": qa.quiz.title,
            "score": float(qa.score) if qa.score is not None else None,
            "max_score": float(qa.max_score) if hasattr(qa, 'max_score') and qa.max_score is not None else None,
            "passed": qa.passed,
            "attempted_at": qa.created_at.isoformat()
        } for qa in quiz_attempts]

        # 6. Fetch Assignment History
        from apps.assignments.models import AssignmentSubmission
        submissions = AssignmentSubmission.objects.filter(student=user)
        assignments_data = [{
            "assignment_title": s.assignment.title,
            "submitted_at": s.created_at.isoformat(),
            "status": s.status,
            "grade": float(s.grade) if s.grade is not None else None,
            "feedback": s.feedback
        } for s in submissions]

        # 7. Fetch Reviews list
        from apps.reviews.models import Review
        reviews = Review.objects.filter(student=user)
        reviews_data = [{
            "course_title": r.course.title,
            "rating": r.rating,
            "comment": getattr(r, 'comment', getattr(r, 'content', '')),
            "created_at": r.created_at.isoformat()
        } for r in reviews]

        # Package into ZIP archive in-memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr('profile.json', json.dumps(profile_data, indent=2))
            zip_file.writestr('courses.json', json.dumps(courses_data, indent=2))
            zip_file.writestr('certificates.json', json.dumps(certs_data, indent=2))
            zip_file.writestr('notes.json', json.dumps(notes_data, indent=2))
            zip_file.writestr('quizzes.json', json.dumps(quizzes_data, indent=2))
            zip_file.writestr('assignments.json', json.dumps(assignments_data, indent=2))
            zip_file.writestr('reviews.json', json.dumps(reviews_data, indent=2))

        zip_buffer.seek(0)
        
        response = HttpResponse(zip_buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="skillsphere_export_{user.username}.zip"'
        return response


class AccountActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountActivity
        fields = ('id', 'event_type', 'description', 'ip_address', 'created_at')


class AccountActivityView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        activities = AccountActivity.objects.filter(user=request.user)[:50]
        serializer = AccountActivitySerializer(activities, many=True)
        return Response(serializer.data)
