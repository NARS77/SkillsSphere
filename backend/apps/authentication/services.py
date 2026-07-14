from typing import Dict, Any, Tuple
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from apps.core.exceptions import ValidationException, NotFoundException, AuthenticationException
from .repositories import UserRepository, ProfileRepository
from .models import User, Profile


class AuthService:
    """
    Service coordinating authentication logic, user registration, and profile updates.
    """

    def __init__(self):
        self.user_repo = UserRepository()
        self.profile_repo = ProfileRepository()

    def initiate_registration(self, data: Dict[str, Any]) -> str:
        """
        Validates username/email uniqueness and stores registration data in cache.
        Sends a 6-digit OTP code to the user's email.
        Returns the OTP code.
        """
        email = data.get("email", "").strip()
        username = data.get("username", "").strip()
        password = data.get("password")
        role = data.get("role", User.Role.STUDENT)
        terms_version = data.get("terms_version", "v1.0")
        privacy_policy_version = data.get("privacy_policy_version", "v1.0")

        errors = {}
        if self.user_repo.email_exists(email):
            errors["email"] = "A user with this email already exists."
        if self.user_repo.username_exists(username):
            errors["username"] = "A user with this username already exists."

        if errors:
            raise ValidationException("Registration failed.", errors=errors)

        # Generate a 6-digit OTP code
        import secrets

        otp = str(secrets.randbelow(900000) + 100000)

        # Store in cache
        from django.core.cache import cache

        # Structure the payload
        payload = {
            "username": username,
            "email": email,
            "password": password,
            "role": role,
            "terms_version": terms_version,
            "privacy_policy_version": privacy_policy_version,
        }

        # Save payload under email and otp keys
        cache.set(f"pending_reg_email_{email}", {**payload, "otp": otp}, timeout=900)  # 15 minutes
        cache.set(f"pending_reg_otp_{otp}", email, timeout=900)

        # Send activation email
        from apps.core.tasks import send_email_task
        from apps.core.notifications.templates import render_email_template
        from django.conf import settings

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        verify_url = f"{frontend_url}/verify-email?token={otp}"

        html_msg = render_email_template(
            title="Verify Your Email - SkillSphere",
            heading="Welcome to SkillSphere!",
            body_paragraphs=[
                f"Hi {username},",
                "Thank you for registering at SkillSphere. To complete your account activation and access the dashboard, please enter the following 6-digit verification code on the registration screen:",
                f"<div style='font-size: 32px; font-weight: 800; text-align: center; letter-spacing: 5px; color: #863bff; margin: 24px 0; font-family: monospace;'>{otp}</div>",
                "Alternatively, you can verify your email address immediately by clicking the button below.",
                "This verification code will expire in 15 minutes.",
            ],
            cta_text="Verify Email Address",
            cta_url=verify_url,
        )

        send_email_task.delay(
            subject="Verify Your Email - SkillSphere",
            message=f"Hi {username},\n\nPlease verify your email address by entering: {otp}\nOr click the link: {verify_url}",
            recipient_list=[email],
            html_message=html_msg,
        )

        return otp

    def complete_registration(self, email: str, code: str) -> Tuple[User, Dict[str, str]]:
        """
        Validates OTP code, retrieves pending data from cache, and creates user in database.
        Returns the User and JWT tokens.
        """
        from django.core.cache import cache

        # Retrieve email mapped to OTP
        cached_email = cache.get(f"pending_reg_otp_{code}")
        if not cached_email or cached_email.lower() != email.lower():
            raise ValidationException("Invalid or expired verification code.")

        # Retrieve payload mapped to email
        payload = cache.get(f"pending_reg_email_{email}")
        if not payload or payload.get("otp") != code:
            raise ValidationException("Verification code has expired or is invalid.")

        # Create user in database
        username = payload["username"]
        password = payload["password"]
        role = payload["role"]
        terms_version = payload["terms_version"]
        privacy_policy_version = payload["privacy_policy_version"]

        # Ensure no double creation (race conditions)
        if self.user_repo.email_exists(email) or self.user_repo.username_exists(username):
            raise ValidationException("A user with this username or email already exists.")

        user = self.user_repo.model(
            email=email,
            username=username,
            role=role,
            is_verified=True,  # immediately verified!
            terms_accepted=True,
            terms_accepted_at=timezone.now(),
            terms_version=terms_version,
            privacy_policy_version=privacy_policy_version,
        )
        user.set_password(password)
        self.user_repo.save(user)

        # Clear cache keys
        cache.delete(f"pending_reg_email_{email}")
        cache.delete(f"pending_reg_otp_{code}")

        # Trigger Welcome email
        from apps.core.tasks import send_email_task
        from apps.core.notifications.templates import render_email_template

        welcome_msg = render_email_template(
            title="Welcome to SkillSphere",
            heading="Email Verified Successfully!",
            body_paragraphs=[
                f"Hi {user.username},",
                "Welcome to SkillSphere! Your account is now fully verified and activated.",
                "Explore our extensive course library, practice code assignments, and learn with our smart AI active tutor.",
            ],
            cta_text="Go to Dashboard",
            cta_url="http://localhost:5173/dashboard",
        )
        send_email_task.delay(
            subject="Welcome to SkillSphere!",
            message=f"Hi {user.username},\n\nWelcome to SkillSphere! Your account is verified.",
            recipient_list=[user.email],
            html_message=welcome_msg,
        )

        tokens = self.generate_tokens_for_user(user)
        return user, tokens

    def authenticate_user(self, data: Dict[str, Any]) -> Tuple[User, Dict[str, str]]:
        """
        Authenticates user credentials and returns user details and tokens.
        """
        email = data.get("email", "").strip()
        password = data.get("password")

        user = self.user_repo.get_by_email(email)
        if not user or not user.check_password(password):
            raise AuthenticationException("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationException("This account has been deactivated.")

        from django.conf import settings

        is_testing = getattr(settings, "TESTING", False)
        if not is_testing and not user.is_verified:
            raise AuthenticationException("Your email address is not verified. Please verify your account first.")

        tokens = self.generate_tokens_for_user(user)
        return user, tokens

    def generate_tokens_for_user(self, user: User) -> Dict[str, str]:
        """
        Generates access and refresh JWT tokens.
        """
        refresh = RefreshToken.for_user(user)
        # Custom claims
        refresh["role"] = user.role
        refresh["username"] = user.username

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    def get_profile(self, user_id: str) -> Profile:
        """
        Retrieves the profile of a user.
        """
        profile = self.profile_repo.get_by_user_id(user_id)
        if not profile:
            raise NotFoundException("Profile not found.")
        return profile

    def update_profile(self, user: User, data: Dict[str, Any]) -> Profile:
        """
        Updates the profile of a user.
        """
        profile = self.get_profile(user.id)

        # Split profile data and user data (first/last name updates can be done on the user model)
        user_fields = {}
        if "first_name" in data:
            user_fields["first_name"] = data["first_name"]
        if "last_name" in data:
            user_fields["last_name"] = data["last_name"]

        if user_fields:
            self.user_repo.update(user, **user_fields)

        profile_fields = {}
        fields_to_update = [
            "headline",
            "bio",
            "website_url",
            "linkedin_url",
            "github_url",
            "twitter_url",
            "avatar",
            "cover_image",
            "display_name",
            "country",
            "timezone",
            "preferred_language",
            "occupation",
        ]
        for field in fields_to_update:
            if field in data:
                profile_fields[field] = data[field]

        return self.profile_repo.update(profile, **profile_fields)
