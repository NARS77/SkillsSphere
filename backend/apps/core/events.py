from django.dispatch import Signal

# Core events declared as custom Django signals for domain decoupling
course_completed = Signal()        # kwargs: student, course
enrollment_created = Signal()      # kwargs: student, course
course_published = Signal()        # kwargs: course
quiz_submitted = Signal()          # kwargs: student, attempt
assignment_graded = Signal()       # kwargs: student, submission
review_created = Signal()          # kwargs: user, course, review
payment_completed = Signal()       # kwargs: student, order, payment
certificate_issued = Signal()      # kwargs: student, certificate
achievement_unlocked = Signal()    # kwargs: student, badge
