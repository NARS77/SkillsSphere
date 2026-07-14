from rest_framework import permissions


class IsInstructorOfCourse(permissions.BasePermission):
    """
    Object-level permission to only allow instructors of a course (or admins) to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read-only permissions are allowed for any request if view is safe
        # (Though public view list is handled separately, for instructor views we want strict checks)
        if request.user.is_superuser or request.user.role == "ADMIN":
            return True

        return obj.instructor_id == request.user.id
