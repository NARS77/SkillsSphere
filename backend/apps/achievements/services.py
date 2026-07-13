from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from apps.authentication.models import Profile
from .models import Badge, UserAchievement
from apps.core.models import Notification

class XPService:
    @staticmethod
    def initialize_badges():
        # Setup badges
        badges_data = [
            {
                'badge_type': Badge.BadgeType.FIRST_COURSE,
                'name': 'First Course Completed',
                'description': 'Awarded for completing your first full course on SkillSphere.',
                'icon': 'GraduationCap'
            },
            {
                'badge_type': Badge.BadgeType.STREAK_7,
                'name': '7-Day Streak',
                'description': 'Awarded for maintaining a continuous learning streak of 7 days.',
                'icon': 'Flame'
            },
            {
                'badge_type': Badge.BadgeType.QUIZ_MASTER,
                'name': 'Quiz Master',
                'description': 'Awarded for scoring 100% on at least 3 distinct quizzes.',
                'icon': 'BookOpen'
            },
            {
                'badge_type': Badge.BadgeType.ASSIGNMENT_CHAMPION,
                'name': 'Assignment Champion',
                'description': 'Awarded for scoring 90% or above on at least 3 distinct assignments.',
                'icon': 'Trophy'
            },
            {
                'badge_type': Badge.BadgeType.TOP_PERFORMER,
                'name': 'Top Performer',
                'description': 'Awarded for achieving an overall course grade of 95% or above.',
                'icon': 'Sparkles'
            }
        ]
        
        for data in badges_data:
            Badge.objects.get_or_create(badge_type=data['badge_type'], defaults=data)

    @staticmethod
    def award_xp(user, amount, reason="Activity"):
        # Make sure badges exist
        XPService.initialize_badges()

        with transaction.atomic():
            profile, created = Profile.objects.get_or_create(user=user)
            profile.xp += amount
            
            # Streak calculation
            today = timezone.localdate()
            if profile.last_activity_date:
                diff = (today - profile.last_activity_date).days
                if diff == 1:
                    profile.streak += 1
                elif diff > 1:
                    profile.streak = 1
                # if diff == 0: keep the same streak
            else:
                profile.streak = 1
                
            profile.last_activity_date = today
            profile.save()

            # Check and unlock badges
            XPService.check_and_unlock_badges(user, profile)

    @staticmethod
    def check_and_unlock_badges(user, profile):
        # Helper to unlock a badge
        def unlock(badge_type):
            badge = Badge.objects.filter(badge_type=badge_type).first()
            if badge:
                ua, created = UserAchievement.objects.get_or_create(student=user, badge=badge)
                if created:
                    from apps.core.notifications import NotificationService
                    NotificationService.send_notification(
                        user=user,
                        title="Achievement Unlocked!",
                        message=f"Congratulations! You unlocked the badge: {badge.name}.",
                        notification_type="ACHIEVEMENT_UNLOCKED",
                        channels=['in_app', 'email']
                    )
                    from apps.core import events
                    events.achievement_unlocked.send(sender=XPService, student=user, badge=badge)

        # 1. FIRST_COURSE badge
        from apps.certificates.models import Certificate
        if Certificate.objects.filter(student=user).exists():
            unlock(Badge.BadgeType.FIRST_COURSE)

        # 2. STREAK_7 badge
        if profile.streak >= 7:
            unlock(Badge.BadgeType.STREAK_7)

        # 3. QUIZ_MASTER badge
        from apps.quizzes.models import QuizAttempt
        perfect_attempts = QuizAttempt.objects.filter(
            student=user,
            status=QuizAttempt.Status.SUBMITTED,
            percentage=100.0
        ).values('quiz').distinct().count()
        if perfect_attempts >= 3:
            unlock(Badge.BadgeType.QUIZ_MASTER)

        # 4. ASSIGNMENT_CHAMPION badge
        from apps.assignments.models import AssignmentSubmission
        top_submissions = AssignmentSubmission.objects.filter(
            student=user,
            status=AssignmentSubmission.Status.GRADED
        )
        championship_count = 0
        for sub in top_submissions:
            max_score = float(sub.assignment.max_score) if sub.assignment.max_score > 0 else 1.0
            pct = (float(sub.score) / max_score) * 100.0
            if pct >= 90.0:
                championship_count += 1
        if championship_count >= 3:
            unlock(Badge.BadgeType.ASSIGNMENT_CHAMPION)

        # 5. TOP_PERFORMER badge
        from apps.grades.models import GradebookEntry
        if GradebookEntry.objects.filter(student=user, overall_score__gte=95.0).exists():
            unlock(Badge.BadgeType.TOP_PERFORMER)
