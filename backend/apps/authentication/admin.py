from django.contrib import admin
from .models import User, Profile


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "role", "is_staff", "is_superuser", "is_active")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "username")
    ordering = ("email",)

    fields = (
        "email",
        "username",
        "role",
        "password",
        "is_active",
        "is_staff",
        "is_superuser",
        "groups",
        "user_permissions",
    )

    def save_model(self, request, obj, form, change):
        # Hash the password if it's new or changed
        if "password" in form.changed_data or not change:
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "headline", "created_at")
