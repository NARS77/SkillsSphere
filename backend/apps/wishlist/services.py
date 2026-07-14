from django.shortcuts import get_object_or_404
from apps.courses.models import Course
from .models import WishlistItem


class WishlistService:
    @staticmethod
    def toggle_wishlist(student, course_id):
        course = get_object_or_404(Course, id=course_id)
        item_qs = WishlistItem.objects.filter(student=student, course=course)
        if item_qs.exists():
            item_qs.delete()
            return False
        else:
            WishlistItem.objects.create(student=student, course=course)
            return True
