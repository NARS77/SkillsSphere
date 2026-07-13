from datetime import datetime
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from apps.core.exceptions import ValidationException
from .models import Quiz, Question, AnswerOption, QuizAttempt, QuestionAttempt
from apps.achievements.services import XPService
from apps.grades.services import GradebookService
from apps.core.models import Notification

class QuizService:
    @staticmethod
    def start_quiz_attempt(student, quiz_id):
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # Check availability
        now = timezone.now()
        if quiz.available_from and now < quiz.available_from:
            raise ValidationException(f"This quiz is not available until {quiz.available_from}.")
        if quiz.available_until and now > quiz.available_until:
            raise ValidationException(f"This quiz closed on {quiz.available_until}.")

        # Check maximum attempts
        if quiz.max_attempts > 0:
            existing_attempts = QuizAttempt.objects.filter(
                student=student, quiz=quiz, status=QuizAttempt.Status.SUBMITTED
            ).count()
            if existing_attempts >= quiz.max_attempts:
                raise ValidationException("You have reached the maximum number of attempts for this quiz.")

        with transaction.atomic():
            attempt = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                status=QuizAttempt.Status.IN_PROGRESS
            )
            
            # Setup question attempts
            questions = quiz.questions.all()
            if quiz.randomize_questions:
                questions = questions.order_by('?')
                
            for q in questions:
                QuestionAttempt.objects.create(
                    quiz_attempt=attempt,
                    question=q
                )
            
            return attempt

    @staticmethod
    def submit_quiz_attempt(student, attempt_id, answers):
        """
        answers is a dict: { question_attempt_id: { ... selected options, text, ordering, etc. ... } }
        """
        attempt = get_object_or_404(QuizAttempt, id=attempt_id, student=student)
        if attempt.status == QuizAttempt.Status.SUBMITTED:
            raise ValidationException("This attempt has already been submitted.")

        total_weight = 0
        total_earned_score = 0

        with transaction.atomic():
            for qa in attempt.question_attempts.select_related('question').all():
                q = qa.question
                q_weight = q.weight
                total_weight += q_weight
                
                ans_data = answers.get(str(qa.id)) or answers.get(qa.id) or {}
                
                # Set time spent & flagged
                qa.time_spent = ans_data.get('time_spent', 0)
                qa.flagged = ans_data.get('flagged', False)
                
                earned = 0
                is_correct = False
                
                # Grade based on type
                if q.question_type in [Question.QuestionType.SINGLE, Question.QuestionType.TF]:
                    selected_id = ans_data.get('selected_option')
                    if selected_id:
                        option = AnswerOption.objects.filter(id=selected_id, question=q).first()
                        if option:
                            qa.selected_options.set([option])
                            if option.is_correct:
                                earned = q_weight
                                is_correct = True
                                
                elif q.question_type == Question.QuestionType.MULTI:
                    selected_ids = ans_data.get('selected_options', [])
                    options = AnswerOption.objects.filter(id__in=selected_ids, question=q)
                    qa.selected_options.set(options)
                    
                    correct_options = q.options.filter(is_correct=True)
                    correct_ids = set(str(o.id) for o in correct_options)
                    selected_str_ids = set(str(sid) for sid in selected_ids)
                    
                    if correct_ids == selected_str_ids:
                        earned = q_weight
                        is_correct = True
                    elif q.partial_credit and len(correct_ids) > 0:
                        # Partial credit logic
                        correct_selected = len(correct_ids.intersection(selected_str_ids))
                        incorrect_selected = len(selected_str_ids.difference(correct_ids))
                        # Net positive score
                        ratio = max(0, (correct_selected - incorrect_selected) / len(correct_ids))
                        earned = float(q_weight) * ratio
                        is_correct = ratio == 1.0

                elif q.question_type in [Question.QuestionType.SHORT, Question.QuestionType.FILL, Question.QuestionType.PREDICT]:
                    text = ans_data.get('text_answer', '').strip()
                    qa.text_answer = text
                    
                    # Check text against correct answers
                    correct_options = q.options.filter(is_correct=True)
                    match_found = False
                    for opt in correct_options:
                        if opt.text.strip().lower() == text.lower():
                            match_found = True
                            break
                    if match_found:
                        earned = q_weight
                        is_correct = True
                        
                elif q.question_type == Question.QuestionType.MATCH:
                    # matching_answer: { option_id: matching_text }
                    match_dict = ans_data.get('matching_answer', {})
                    qa.matching_answer = match_dict
                    
                    options = q.options.all()
                    matches_correct = 0
                    for opt in options:
                        student_match = match_dict.get(str(opt.id)) or match_dict.get(opt.id)
                        if student_match and student_match.strip().lower() == opt.match_text.strip().lower():
                            matches_correct += 1
                            
                    if len(options) > 0:
                        if matches_correct == len(options):
                            earned = q_weight
                            is_correct = True
                        elif q.partial_credit:
                            earned = float(q_weight) * (matches_correct / len(options))
                            
                elif q.question_type == Question.QuestionType.ORDER:
                    # ordering_answer: [option_id, option_id, ...]
                    order_list = ans_data.get('ordering_answer', [])
                    qa.ordering_answer = order_list
                    
                    options = sorted(list(q.options.all()), key=lambda o: o.order)
                    correct_order_ids = [str(o.id) for o in options]
                    student_order_str = [str(oid) for oid in order_list]
                    
                    if correct_order_ids == student_order_str:
                        earned = q_weight
                        is_correct = True
                
                # Apply negative marking if quiz has it and answer is completely incorrect
                if attempt.quiz.negative_marking and not is_correct and earned == 0:
                    earned = -float(q_weight) * 0.25 # Deduct 25% of question weight

                qa.score = earned
                qa.is_correct = is_correct
                qa.graded = True
                qa.save()
                total_earned_score += earned

            # Save attempt final values
            attempt.status = QuizAttempt.Status.SUBMITTED
            attempt.submitted_at = timezone.now()
            attempt.score = max(0, total_earned_score)
            
            total_weight = float(total_weight) if total_weight > 0 else 1.0
            attempt.percentage = (float(attempt.score) / total_weight) * 100.0
            attempt.passed = attempt.percentage >= attempt.quiz.passing_percentage
            attempt.save()

            # Award XP and handle badge checking
            xp_awarded = 50 if attempt.passed else 10
            XPService.award_xp(student, xp_awarded, f"Completed quiz attempt: {attempt.quiz.title}")

            # Recalculate Gradebook
            GradebookService.recalculate_gradebook_entry(student, attempt.quiz.course)

            # Check if student completed course (delegated to async background worker)
            from apps.certificates.tasks import generate_certificate_task
            generate_certificate_task.delay(student.id, attempt.quiz.course.id)

            # Send Notification
            Notification.objects.create(
                user=student,
                title=f"Quiz Graded: {attempt.quiz.title}",
                message=f"You scored {attempt.percentage:.1f}% on your attempt. Pass status: {attempt.passed}.",
                notification_type="QUIZ_RESULTS"
            )

            # Instructor Notification for completed course
            if attempt.passed:
                Notification.objects.create(
                    user=attempt.quiz.course.instructor,
                    title="Student Completed Quiz",
                    message=f"Student {student.email} passed quiz {attempt.quiz.title} with {attempt.percentage:.1f}%.",
                    notification_type="INSTRUCTOR_QUIZ_COMPLETED"
                )

            return attempt
