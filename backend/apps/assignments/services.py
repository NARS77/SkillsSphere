import math
from django.utils import timezone
from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from django.db import transaction
from .models import Assignment, AssignmentSubmission
from apps.grades.services import GradebookService
from apps.achievements.services import XPService
from apps.core.models import Notification

class AssignmentService:
    @staticmethod
    def submit_assignment(student, assignment_id, file=None, github_repo_url='', text_submission=''):
        assignment = get_object_or_404(Assignment, id=assignment_id)
        now = timezone.now()

        # Check late submission rules
        if now > assignment.due_date:
            if assignment.late_submission_rule == Assignment.LateRules.DENIED:
                raise ValidationException("Late submissions are not accepted for this assignment.")

        with transaction.atomic():
            # Check if replacing an existing ungraded submission
            existing = AssignmentSubmission.objects.filter(
                assignment=assignment,
                student=student
            ).first()
            
            if existing:
                if existing.status == AssignmentSubmission.Status.GRADED:
                    raise ValidationException("You cannot replace a submission that has already been graded.")
                
                # Update existing submission
                existing.file = file if file else existing.file
                existing.github_repo_url = github_repo_url or existing.github_repo_url
                existing.text_submission = text_submission or existing.text_submission
                existing.submitted_at = now
                existing.save()
                submission = existing
            else:
                submission = AssignmentSubmission.objects.create(
                    assignment=assignment,
                    student=student,
                    file=file,
                    github_repo_url=github_repo_url,
                    text_submission=text_submission,
                    submitted_at=now
                )

            # Award XP for submitting
            XPService.award_xp(student, 15, f"Submitted assignment: {assignment.title}")

            # Notify Instructor
            Notification.objects.create(
                user=assignment.course.instructor,
                title="New Assignment Submission",
                message=f"Student {student.email} has submitted workspace for '{assignment.title}'.",
                notification_type="INSTRUCTOR_ASSIGNMENT_SUBMISSION"
            )

            return submission

    @staticmethod
    def grade_submission(submission_id, grader, score, feedback='', rubric_scoring=None):
        submission = get_object_or_404(AssignmentSubmission, id=submission_id)
        assignment = submission.assignment
        
        if score < 0 or score > assignment.max_score:
            raise ValidationException(f"Score must be between 0 and {assignment.max_score}.")

        now = timezone.now()
        final_score = float(score)

        # Apply late penalty if applicable
        if submission.submitted_at > assignment.due_date and assignment.late_submission_rule == Assignment.LateRules.PENALIZED:
            days_late = math.ceil((submission.submitted_at - assignment.due_date).total_seconds() / 86400.0)
            penalty = float(assignment.late_penalty_percentage) * days_late
            penalty_amount = (penalty / 100.0) * final_score
            final_score = max(0.0, final_score - penalty_amount)

        with transaction.atomic():
            submission.score = final_score
            submission.feedback = feedback
            submission.rubric_scoring = rubric_scoring or {}
            submission.status = AssignmentSubmission.Status.GRADED
            submission.graded_at = now
            submission.graded_by = grader
            submission.save()

            # Recalculate Gradebook
            GradebookService.recalculate_gradebook_entry(submission.student, assignment.course)

            # Check Certificate issue (delegated to async background worker)
            from apps.certificates.tasks import generate_certificate_task
            generate_certificate_task.delay(submission.student.id, assignment.course.id)

            # Notify Student
            Notification.objects.create(
                user=submission.student,
                title=f"Assignment Graded: {assignment.title}",
                message=f"Your assignment has been graded. Score: {submission.score}/{assignment.max_score}.",
                notification_type="ASSIGNMENT_GRADED"
            )

            # Award XP to Student for receiving grades
            XPService.award_xp(submission.student, 30, f"Received grades for: {assignment.title}")

            return submission
