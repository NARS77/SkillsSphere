from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.courses.models import Course, Category
from apps.coupons.models import Coupon
from apps.orders.models import Order
from apps.enrollments.models import Enrollment
from .services import CommerceService

User = get_user_model()


class CommerceServiceTestCase(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student1", email="student1@test.com", password="password123", role=User.Role.STUDENT
        )
        self.instructor = User.objects.create_user(
            username="instructor1", email="instructor1@test.com", password="password123", role=User.Role.INSTRUCTOR
        )
        self.category = Category.objects.create(name="Business", icon="briefcase", color="blue")
        self.course1 = Course.objects.create(
            title="Marketing 101",
            short_description="Intro to Marketing",
            description="Detailed course desc",
            instructor=self.instructor,
            category=self.category,
            price=100.00,
        )
        self.course2 = Course.objects.create(
            title="Finance 101",
            short_description="Intro to Finance",
            description="Detailed course desc",
            instructor=self.instructor,
            category=self.category,
            price=200.00,
        )

    def test_coupon_percentage_discount(self):
        # 15% off global coupon
        coupon = Coupon.objects.create(
            code="SAVE15",
            coupon_type=Coupon.CouponType.PERCENTAGE,
            value=15.00,
            expiry_date=timezone.now() + timezone.timedelta(days=10),
            max_uses=10,
            uses_count=0,
        )
        order = CommerceService.checkout(self.student, [self.course1.id, self.course2.id], "SAVE15")
        # Total price: 100 * 0.85 + 200 * 0.85 = 85 + 170 = 255.00
        self.assertEqual(float(order.total_amount), 255.00)

    def test_coupon_fixed_discount(self):
        # $50 off global coupon
        coupon = Coupon.objects.create(
            code="OFF50",
            coupon_type=Coupon.CouponType.FIXED,
            value=50.00,
            expiry_date=timezone.now() + timezone.timedelta(days=10),
            max_uses=10,
            uses_count=0,
        )
        order = CommerceService.checkout(self.student, [self.course1.id], "OFF50")
        # Price: 100 - 50 = 50.00
        self.assertEqual(float(order.total_amount), 50.00)

    def test_verify_payment_enrolls_student(self):
        order = CommerceService.checkout(self.student, [self.course1.id])
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.course1).exists())

        # Verify Payment
        completed_order = CommerceService.verify_and_complete_payment(order.id, "mock_transaction_123")
        self.assertEqual(completed_order.status, Order.Status.PAID)
        self.assertTrue(Enrollment.objects.filter(student=self.student, course=self.course1, is_active=True).exists())

        # Verify Payment record creation
        from .models import Payment

        payment = Payment.objects.get(order=completed_order)
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertIsNotNone(payment.receipt_pdf)
