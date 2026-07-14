from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Profile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "role",
            "is_verified",
            "first_name",
            "last_name",
            "terms_accepted",
            "terms_accepted_at",
        )
        read_only_fields = ("id", "is_verified", "terms_accepted", "terms_accepted_at")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.STUDENT)
    accept_terms = serializers.BooleanField(required=True)
    terms_version = serializers.CharField(max_length=20, required=False, default="v1.0")
    privacy_policy_version = serializers.CharField(max_length=20, required=False, default="v1.0")

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the Terms of Service and Privacy Policy to register.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "user",
            "headline",
            "bio",
            "avatar",
            "cover_image",
            "website_url",
            "linkedin_url",
            "github_url",
            "twitter_url",
            "display_name",
            "country",
            "timezone",
            "preferred_language",
            "occupation",
            "xp",
            "streak",
        )
        read_only_fields = ("id", "user", "xp", "streak")


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    headline = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    cover_image = serializers.ImageField(required=False, allow_null=True)
    website_url = serializers.URLField(required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    github_url = serializers.URLField(required=False, allow_blank=True)
    twitter_url = serializers.URLField(required=False, allow_blank=True)
    display_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=100, required=False)
    preferred_language = serializers.CharField(max_length=20, required=False)
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
