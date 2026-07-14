from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """
    Allows access only to authenticated users with a STUDENT role.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_student)


class IsInstructor(permissions.BasePermission):
    """
    Allows access only to authenticated users with an INSTRUCTOR role.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_instructor)


class IsAdministrator(permissions.BasePermission):
    """
    Allows access only to authenticated users with an ADMIN role (or superusers).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_administrator)
