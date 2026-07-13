import csv
import io
from django.db.models import Max
from apps.enrollments.models import Enrollment
from .models import GradebookEntry

class GradebookService:
    @staticmethod
    def recalculate_gradebook_entry(student, course):
        enrollment = Enrollment.objects.filter(student=student, course=course).first()
        if not enrollment:
            return None

        from apps.quizzes.models import Quiz, QuizAttempt
        from apps.assignments.models import Assignment, AssignmentSubmission

        # 1. Quizzes average calculation
        quizzes = Quiz.objects.filter(course=course, status=Quiz.Status.PUBLISHED)
        quiz_pcts = []
        for quiz in quizzes:
            # Find best attempt
            best_attempt = QuizAttempt.objects.filter(
                student=student, 
                quiz=quiz,
                status=QuizAttempt.Status.SUBMITTED
            ).order_by('-percentage').first()
            
            if best_attempt:
                quiz_pcts.append(float(best_attempt.percentage))
            else:
                quiz_pcts.append(0.0)
        
        quiz_avg = sum(quiz_pcts) / len(quiz_pcts) if quiz_pcts else 0.0

        # 2. Assignments average calculation
        assignments = Assignment.objects.filter(course=course)
        assignment_pcts = []
        for ass in assignments:
            submission = AssignmentSubmission.objects.filter(
                student=student,
                assignment=ass,
                status=AssignmentSubmission.Status.GRADED
            ).first()
            
            if submission:
                max_score = float(ass.max_score) if ass.max_score > 0 else 1.0
                pct = (float(submission.score) / max_score) * 100.0
                assignment_pcts.append(pct)
            else:
                assignment_pcts.append(0.0)

        ass_avg = sum(assignment_pcts) / len(assignment_pcts) if assignment_pcts else 0.0

        # 3. Overall weighted score
        if quiz_pcts and assignment_pcts:
            overall = (quiz_avg + ass_avg) / 2.0
        elif quiz_pcts:
            overall = quiz_avg
        elif assignment_pcts:
            overall = ass_avg
        else:
            overall = 0.0

        # Letter grade mapping
        if overall >= 90.0:
            letter = 'A'
        elif overall >= 80.0:
            letter = 'B'
        elif overall >= 70.0:
            letter = 'C'
        elif overall >= 60.0:
            letter = 'D'
        else:
            letter = 'F'

        passed = overall >= 60.0

        entry, created = GradebookEntry.objects.update_or_create(
            enrollment=enrollment,
            defaults={
                'student': student,
                'course': course,
                'quiz_average': quiz_avg,
                'assignment_average': ass_avg,
                'overall_score': overall,
                'grade_letter': letter,
                'passed': passed
            }
        )

        return entry

    @staticmethod
    def export_gradebook_csv(course):
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            'Student Email', 
            'Student Name', 
            'Quiz Average (%)', 
            'Assignment Average (%)', 
            'Overall Score (%)', 
            'Grade Letter', 
            'Status'
        ])
        
        entries = GradebookEntry.objects.filter(course=course).select_related('student')
        for entry in entries:
            student = entry.student
            name = f"{student.first_name} {student.last_name}".strip() or student.username
            status = 'Passed' if entry.passed else 'Failed'
            
            writer.writerow([
                student.email,
                name,
                f"{entry.quiz_average:.1f}",
                f"{entry.assignment_average:.1f}",
                f"{entry.overall_score:.1f}",
                entry.grade_letter,
                status
            ])
            
        return output.getvalue()
