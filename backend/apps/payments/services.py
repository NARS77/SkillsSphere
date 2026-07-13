import io
import uuid
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.files.base import ContentFile
from apps.core.exceptions import ValidationException
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.orders.models import Order, OrderItem
from apps.coupons.services import CouponService
from apps.core.models import Notification
from .models import Payment

class CommerceService:
    @staticmethod
    def calculate_discount(price, coupon):
        from apps.coupons.models import Coupon
        price = Decimal(str(price))
        val = Decimal(str(coupon.value))
        if coupon.coupon_type == Coupon.CouponType.PERCENTAGE:
            discount = price * (val / Decimal('100.00'))
            return max(Decimal('0.00'), price - discount)
        elif coupon.coupon_type == Coupon.CouponType.FIXED:
            return max(Decimal('0.00'), price - val)
        return price

    @classmethod
    def checkout(cls, student, course_ids, coupon_code=None):
        if not course_ids:
            raise ValidationException("Select at least one course to checkout.")

        courses = Course.objects.filter(id__in=course_ids)
        if len(courses) != len(course_ids):
            raise ValidationException("One or more selected courses are invalid.")

        # Check if already enrolled
        for course in courses:
            if Enrollment.objects.filter(student=student, course=course, is_active=True).exists():
                raise ValidationException(f"You are already enrolled in {course.title}.")

        # Calculate prices
        coupon = None
        if coupon_code:
            # We check the first course for validation if coupon is course-specific
            # (or validate globally if course is null)
            coupon = CouponService.validate_coupon(coupon_code)

        # Create Order
        order = Order.objects.create(
            student=student,
            total_amount=Decimal('0.00'),
            coupon=coupon
        )

        total_amount = Decimal('0.00')
        for course in courses:
            price = Decimal(str(course.price))
            # If coupon is specific to this course or coupon is global
            if coupon and (not coupon.course or coupon.course == course):
                price = cls.calculate_discount(price, coupon)
            
            OrderItem.objects.create(
                order=order,
                course=course,
                price=price
            )
            total_amount += price

        order.total_amount = total_amount
        order.save()

        # Audit Log
        from apps.audit_logs.services import AuditLogService
        AuditLogService.log_action(student, "CHECKOUT_INITIATED", {
            "order_id": str(order.id),
            "total_amount": float(total_amount),
            "coupon": coupon_code
        })

        return order

    @classmethod
    def verify_and_complete_payment(cls, order_id, transaction_id, provider=Payment.Provider.MOCK):
        order = get_object_or_404(Order, id=order_id)
        if order.status == Order.Status.PAID:
            return order

        # Verify using abstract provider adapters
        from apps.payments.providers import get_payment_provider
        gateway = get_payment_provider(provider)
        
        is_valid = gateway.verify_payment({
            "transaction_id": transaction_id,
            "payment_id": transaction_id,
            "order_id": order_id
        })
        if not is_valid:
            raise ValidationException("Payment verification failed with the selected provider gateway.")

        if not transaction_id:
            transaction_id = f"txn_{uuid.uuid4().hex[:12]}"

        # Complete Order
        order.status = Order.Status.PAID
        order.save()

        # Create Payment
        payment = Payment.objects.create(
            order=order,
            payment_provider=provider,
            transaction_id=transaction_id,
            status=Payment.Status.SUCCESS
        )

        # Increment Coupon uses
        if order.coupon:
            order.coupon.uses_count += 1
            order.coupon.save()

        # Enroll student in courses
        for item in order.items.all():
            Enrollment.objects.get_or_create(
                student=order.student,
                course=item.course,
                defaults={'is_active': True}
            )

        # Generate receipt PDF asynchronously via Celery task
        from apps.payments.tasks import generate_invoice_task
        generate_invoice_task.delay(str(payment.id))

        # Send Notifications
        from apps.core.notifications import NotificationService
        NotificationService.send_notification(
            user=order.student,
            title="Purchase Confirmed",
            message=f"Thank you for your purchase! Your order total was ${order.total_amount:.2f}.",
            notification_type="PAYMENT_SUCCESS",
            channels=['in_app', 'email']
        )

        for item in order.items.all():
            NotificationService.send_notification(
                user=item.course.instructor,
                title="New Student Enrollment",
                message=f"{order.student.username} purchased and enrolled in {item.course.title}.",
                notification_type="NEW_ENROLLMENT",
                channels=['in_app', 'email']
            )

        # Audit Log
        from apps.audit_logs.services import AuditLogService
        AuditLogService.log_action(order.student, "PAYMENT_VERIFIED", {
            "order_id": str(order.id),
            "transaction_id": transaction_id,
            "total_amount": float(order.total_amount)
        })

        return order

    @staticmethod
    def generate_payout_receipt(payment):
        from PIL import Image, ImageDraw
        
        # 1. Create landscape/portrait canvas image
        width, height = 500, 700
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)

        # 2. Draw border
        draw.rectangle([(15, 15), (width - 15, height - 15)], outline="#2563EB", width=2)
        draw.rectangle([(20, 20), (width - 20, height - 20)], outline="#E2E8F0", width=1)

        # 3. Write titles & headers (with brand logo image)
        try:
            from django.conf import settings
            import os
            logo_path = os.path.join(settings.BASE_DIR.parent, 'docs', 'branding', 'icon_mark.png')
            if os.path.exists(logo_path):
                logo_img = Image.open(logo_path).resize((40, 40), Image.Resampling.LANCZOS)
                image.paste(logo_img, (40, 40), logo_img.convert("RGBA") if logo_img.mode != "RGBA" else None)
        except Exception:
            pass

        draw.text((95, 52), "SKILLSPHERE PAYMENT RECEIPT", fill="#1E3A8A")
        draw.text((40, 100), f"Receipt Date: {timezone.now().strftime('%Y-%m-%d %H:%M')}", fill="#475569")
        draw.text((40, 120), f"Transaction ID: {payment.transaction_id}", fill="#475569")
        draw.text((40, 140), f"Order ID: {payment.order.id}", fill="#475569")
        draw.text((40, 160), f"Customer: {payment.order.student.username} ({payment.order.student.email})", fill="#475569")

        draw.line([(40, 195), (width - 40, 195)], fill="#CBD5E1", width=1)

        # 4. Itemized Purchases
        draw.text((40, 215), "Purchased Courses", fill="#1E293B")
        
        y_offset = 245
        for item in payment.order.items.all():
            draw.text((40, y_offset), f"- {item.course.title[:40]}", fill="#334155")
            draw.text((380, y_offset), f"${item.price:.2f}", fill="#334155")
            y_offset += 25

        draw.line([(40, y_offset + 10), (width - 40, y_offset + 10)], fill="#CBD5E1", width=1)

        # 5. Total Price
        y_offset += 30
        draw.text((40, y_offset), "Total Paid:", fill="#1E3A8A")
        draw.text((380, y_offset), f"${payment.order.total_amount:.2f}", fill="#1E3A8A")

        y_offset += 40
        draw.text((40, y_offset), f"Payment Provider: {payment.payment_provider}", fill="#475569")
        draw.text((40, y_offset + 20), "Status: PAID / SUCCESSFUL", fill="#16A34A")

        draw.text((40, height - 60), "Thank you for studying with SkillSphere!", fill="#64748B")

        # 6. Save as PDF format in memory and upload to Django FileField
        buffer = io.BytesIO()
        image.save(buffer, format="PDF")
        pdf_content = ContentFile(buffer.getvalue())

        payment.receipt_pdf.save(f"receipt_{payment.order.id}.pdf", pdf_content)
        payment.save()
