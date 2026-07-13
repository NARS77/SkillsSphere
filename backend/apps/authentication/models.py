import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.core.models import TimeStampedModel

class User(AbstractUser):
    """
    Custom user model where email is the unique identifier for authentication
    instead of usernames.
    """
    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        INSTRUCTOR = 'INSTRUCTOR', 'Instructor'
        ADMIN = 'ADMIN', 'Administrator'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT
    )
    is_verified = models.BooleanField(default=False)
    
    # 2FA and Notification Preferences fields
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, blank=True, default='')
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Toggles for email_notifications, push_notifications, etc."
    )
    
    # Terms & Privacy acceptance
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=20, blank=True, default='')
    privacy_policy_version = models.CharField(max_length=20, blank=True, default='')

    # Soft Delete Fields
    deleted_at = models.DateTimeField(null=True, blank=True)
    deletion_feedback = models.TextField(blank=True, default='')

    # Use email instead of username for auth
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR

    @property
    def is_administrator(self):
        return self.role == self.Role.ADMIN or self.is_superuser


class LoginHistory(TimeStampedModel):
    """
    Tracks user login history records for security auditing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_histories')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} logged in from {self.ip_address or 'Unknown IP'}"


class Profile(TimeStampedModel):
    """
    Profile model storing public bio, avatar, and social links of students/instructors.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    headline = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    website_url = models.URLField(blank=True, default='')
    linkedin_url = models.URLField(blank=True, default='')
    github_url = models.URLField(blank=True, default='')
    twitter_url = models.URLField(blank=True, default='')
    
    # Extra Profile Fields
    display_name = models.CharField(max_length=255, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    timezone = models.CharField(max_length=100, default='UTC')
    preferred_language = models.CharField(max_length=20, default='en')
    occupation = models.CharField(max_length=100, blank=True, default='')

    # Gamification and Streak Fields
    xp = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user.email}"


class UserPreference(TimeStampedModel):
    """
    User settings preferences including theme, GDPR cookie consent, accessibility, and notifications.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    theme = models.CharField(max_length=20, default='system')
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    accessibility_preferences = models.JSONField(default=dict, blank=True)

    # GDPR Cookie Consent Toggles
    cookie_consent_essential = models.BooleanField(default=True)
    cookie_consent_analytics = models.BooleanField(default=False)
    cookie_consent_functional = models.BooleanField(default=False)
    cookie_consent_marketing = models.BooleanField(default=False)
    cookie_consent_version = models.CharField(max_length=20, default='v1.0')
    cookie_consent_at = models.DateTimeField(null=True, blank=True)

    # Granular Notification Settings
    course_updates = models.BooleanField(default=True)
    assignment_reminders = models.BooleanField(default=True)
    quiz_reminders = models.BooleanField(default=True)
    ai_notifications = models.BooleanField(default=True)
    marketing_emails = models.BooleanField(default=False)
    community_notifications = models.BooleanField(default=True)
    purchase_emails = models.BooleanField(default=True)

    # Privacy Settings
    public_profile_visibility = models.BooleanField(default=True)
    show_achievements = models.BooleanField(default=True)
    show_certificates = models.BooleanField(default=True)
    show_enrolled_courses = models.BooleanField(default=True)
    messaging_preferences = models.CharField(max_length=20, default='ALL') # ALL, INSTRUCTORS, NONE

    def __str__(self):
        return f"Preferences of {self.user.email}"


class UserSession(models.Model):
    """
    Tracks active user JWT login sessions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_token_jti = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    browser = models.CharField(max_length=100, blank=True, default='')
    device_type = models.CharField(max_length=50, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='Unknown')
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Session {self.id} for {self.user.email}"


class AccountActivity(models.Model):
    """
    Auditing timeline of account security and interaction actions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    event_type = models.CharField(max_length=50) # e.g. LOGIN, PASSWORD_CHANGE, EMAIL_CHANGE, PURCHASE
    description = models.TextField()
    ip_address = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.user.email} at {self.created_at}"


class EmailVerificationToken(models.Model):
    """
    Secure activation verification tokens for registration and email changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verifications')
    email = models.EmailField()
    token = models.CharField(max_length=255, unique=True)
    token_type = models.CharField(max_length=20, default='REGISTER') # REGISTER, EMAIL_CHANGE
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at


class PasswordResetToken(models.Model):
    """
    Secure password recovery tokens.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at


@receiver(post_save, sender=User)
def create_user_profile_and_preferences(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        UserPreference.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile_and_preferences(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    if hasattr(instance, 'preferences'):
        instance.preferences.save()
