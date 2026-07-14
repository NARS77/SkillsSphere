from django.db.models import Sum, Count, Q
from django.utils import timezone
from apps.orders.models import Order, OrderItem
from apps.courses.models import Course
from apps.enrollments.models import Enrollment


class ReportService:
    @staticmethod
    def get_instructor_revenue_stats(instructor):
        # 1. Total paid order items for instructor courses
        paid_items = OrderItem.objects.filter(course__instructor=instructor, order__status=Order.Status.PAID)

        total_earnings = paid_items.aggregate(total=Sum("price"))["total"] or 0.00

        # 2. Monthly earnings
        now = timezone.now()
        monthly_items = paid_items.filter(order__created_at__year=now.year, order__created_at__month=now.month)
        monthly_earnings = monthly_items.aggregate(total=Sum("price"))["total"] or 0.00

        # 3. Pending payouts
        # Let's say payouts are handled in Payout model. Payouts are PENDING vs PAID.
        # We can calculate the total PAID payouts and subtract from total_earnings to get pending!
        from .models import Payout

        paid_payouts_total = (
            Payout.objects.filter(instructor=instructor, status=Payout.Status.PAID).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0.00
        )

        pending_payouts = float(total_earnings) - float(paid_payouts_total)

        # 4. Refunds (refunded order items)
        refunded_items = OrderItem.objects.filter(course__instructor=instructor, order__status=Order.Status.REFUNDED)
        refunds_total = refunded_items.aggregate(total=Sum("price"))["total"] or 0.00

        # 5. Best-selling courses list
        best_sellers = (
            Course.objects.filter(instructor=instructor)
            .annotate(
                sales_count=Count("order_items", filter=Q(order_items__order__status=Order.Status.PAID)),
                revenue=Sum("order_items__price", filter=Q(order_items__order__status=Order.Status.PAID)),
            )
            .order_by("-sales_count")[:5]
        )

        best_selling_list = []
        for course in best_sellers:
            best_selling_list.append(
                {
                    "course_title": course.title,
                    "sales_count": course.sales_count,
                    "revenue": float(course.revenue or 0.00),
                }
            )

        # 6. Revenue trends over time (past 30 days)
        thirty_days_ago = now - timezone.timedelta(days=30)
        daily_trends = (
            paid_items.filter(order__created_at__gte=thirty_days_ago)
            .values("order__created_at__date")
            .annotate(daily_total=Sum("price"), sales_count=Count("id"))
            .order_by("order__created_at__date")
        )

        revenue_trends = []
        for trend in daily_trends:
            revenue_trends.append(
                {
                    "date": trend["order__created_at__date"].strftime("%Y-%m-%d"),
                    "revenue": float(trend["daily_total"] or 0.00),
                    "sales_count": trend["sales_count"],
                }
            )

        return {
            "total_earnings": float(total_earnings),
            "monthly_earnings": float(monthly_earnings),
            "pending_payouts": max(0.0, pending_payouts),
            "refunds": float(refunds_total),
            "best_selling_courses": best_selling_list,
            "revenue_trends": revenue_trends,
        }
