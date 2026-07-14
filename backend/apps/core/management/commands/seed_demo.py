import random
import uuid
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.utils import timezone

from apps.authentication.models import Profile, UserPreference
from apps.courses.models import Category, Course
from apps.curriculum.models import Section, Lesson, LessonResource
from apps.enrollments.models import Enrollment, UserProgress, WatchHistory
from apps.quizzes.models import Quiz, Question, AnswerOption, QuizAttempt
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.certificates.models import Certificate
from apps.reviews.models import Review
from apps.messaging.models import Conversation, Message
from apps.wishlist.models import WishlistItem
from apps.achievements.models import Badge, UserAchievement
from apps.reports.models import Payout
from apps.grades.models import GradebookEntry
from apps.ai.models import ConversationMemory, TokenUsage
from apps.core.models import Notification
from apps.orders.models import Order, OrderItem

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with realistic demo accounts and multi-dimensional training metrics."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Clearing existing data..."))

        # Clear existing seed targets to prevent unique conflicts
        User.objects.filter(email__endswith="@skillsphere.demo").delete()
        Category.objects.all().delete()
        Badge.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("Database cleared! Seeding demo environment..."))

        # ==========================================
        # 1. CREATE ADMINS
        # ==========================================
        self.stdout.write("Creating Admins...")
        admin1 = User.objects.create_superuser(
            username="admin_demo", email="admin@skillsphere.demo", password="Demo@123", role="ADMIN", is_verified=True
        )
        admin2 = User.objects.create_superuser(
            username="admin2_demo", email="admin2@skillsphere.demo", password="Demo@123", role="ADMIN", is_verified=True
        )

        # ==========================================
        # 2. CREATE INSTRUCTORS
        # ==========================================
        self.stdout.write("Creating 10+ Instructors...")
        instructors = []
        instructor_names = [
            ("Dr. Angela", "Yu"),
            ("Colt", "Steele"),
            ("Stephen", "Grider"),
            ("Maximilian", "Schwarzmüller"),
            ("Jonas", "Schmedtmann"),
            ("Brad", "Traversy"),
            ("Mosh", "Hamedani"),
            ("Kent", "C. Dodds"),
            ("Dan", "Abramov"),
            ("Cory", "House"),
            ("Angela", "Carter"),
        ]

        # Seed primary instructor from credentials list
        inst_credentials = User.objects.create_user(
            username="instructor_demo",
            email="instructor@skillsphere.demo",
            password="Demo@123",
            role="INSTRUCTOR",
            is_verified=True,
            first_name="Dr. Angela",
            last_name="Yu",
        )
        instructors.append(inst_credentials)

        for i, (fname, lname) in enumerate(instructor_names[1:]):
            inst = User.objects.create_user(
                username=f"instructor_{i+1}",
                email=f"instructor{i+1}@skillsphere.demo",
                password="Demo@123",
                role="INSTRUCTOR",
                is_verified=True,
                first_name=fname,
                last_name=lname,
            )
            instructors.append(inst)

        # Build Profile & Preferences for Instructors
        for inst in instructors:
            Profile.objects.update_or_create(
                user=inst,
                defaults={
                    "headline": "Expert Software Engineer & Educator",
                    "bio": "Passionate about teaching modern architecture, computer science, and engineering methodologies.",
                    "country": "US",
                    "timezone": "America/New_York",
                    "preferred_language": "en",
                    "occupation": "Instructor",
                },
            )
            UserPreference.objects.get_or_create(user=inst)

        # ==========================================
        # 3. CREATE STUDENTS
        # ==========================================
        self.stdout.write("Creating 100+ Students...")
        students = []

        student_names = [
            ("Rahul", "Sharma"),
            ("Sarah", "Johnson"),
            ("Alex", "Kim"),
            ("Emily", "Carter"),
            ("Ahmed", "Hassan"),
            ("Rohan", "Gupta"),
            ("Jessica", "Taylor"),
            ("Michael", "Chen"),
            ("Siddharth", "Patel"),
            ("Aisha", "Bello"),
            ("Kenji", "Sato"),
            ("Chloe", "Lefevre"),
            ("Carlos", "Gomez"),
            ("David", "Miller"),
            ("John", "Doe"),
            ("Maria", "Rodriguez"),
            ("James", "Wilson"),
            ("Emma", "Davis"),
        ]

        # Seed primary student from credentials list
        stud_credentials = User.objects.create_user(
            username="student_demo",
            email="student@skillsphere.demo",
            password="Demo@123",
            role="STUDENT",
            is_verified=True,
            first_name="Rahul",
            last_name="Sharma",
        )
        students.append(stud_credentials)

        for i in range(1, 105):
            fname, lname = student_names[(i - 1) % len(student_names)]
            stud = User.objects.create_user(
                username=f"student_{i}",
                email=f"student{i}@skillsphere.demo",
                password="Demo@123",
                role="STUDENT",
                is_verified=True,
                first_name=fname,
                last_name=f"{lname}_{i}",
            )
            students.append(stud)

        # Build Profile & Preferences for Students
        for stud in students:
            Profile.objects.update_or_create(
                user=stud,
                defaults={
                    "headline": "Enthusiastic Learner",
                    "bio": "Learning new technological stacks and building modern public portfolio templates.",
                    "country": "US",
                    "timezone": "UTC",
                    "preferred_language": "en",
                    "occupation": "Student",
                    "xp": random.randint(100, 2500),
                    "streak": random.randint(1, 12),
                },
            )
            UserPreference.objects.get_or_create(user=stud)

        # ==========================================
        # 4. CREATE CATEGORIES
        # ==========================================
        self.stdout.write("Creating Categories...")
        categories = []
        cat_data = [
            ("Web Development", "code", "#4F46E5"),
            ("Data Science & AI", "brain", "#10B981"),
            ("Product Design & UI/UX", "layers", "#EC4899"),
            ("Mobile Development", "smartphone", "#F59E0B"),
        ]
        for name, icon, color in cat_data:
            cat = Category.objects.create(
                name=name, slug=slugify(name), icon=icon, color=color, order=len(categories) + 1
            )
            categories.append(cat)

        # ==========================================
        # 5. CREATE COURSES
        # ==========================================
        self.stdout.write("Creating 20+ Courses...")
        courses = []
        course_titles = [
            (
                "React for Beginners",
                "Learn to build high-performance web applications using React hooks, components, and state management.",
                0,
            ),
            (
                "Django REST API Masterclass",
                "Build production-ready, scalable REST APIs using Django, DRF, and JWT authentication.",
                0,
            ),
            (
                "Docker Essentials",
                "Master containerizing applications, writing Dockerfiles, volumes, networks, and container registries.",
                0,
            ),
            (
                "Machine Learning Fundamentals",
                "Implement regression, classification, clustering, neural networks, and decision trees using Python.",
                1,
            ),
            (
                "Cloud Computing with AWS",
                "Explore AWS EC2, S3, RDS, Lambda functions, and serverless application designs.",
                1,
            ),
            (
                "Advanced TypeScript",
                "Master advanced TS types, decorators, generic programming, utilities, and configuration mappings.",
                0,
            ),
            (
                "UI/UX Design Principles",
                "Learn color theory, layout grids, auto-layout, design tokens, and components in Figma.",
                2,
            ),
            (
                "Full-Stack React & Django Monoliths",
                "Combine Vite, React, and Django REST framework for complete monolith deployments.",
                0,
            ),
            (
                "Mastering LLMs & Vector Databases",
                "Implement vector embeddings, RAG architectures, and custom AI agents with LangChain.",
                1,
            ),
            (
                "System Design & Scalable Architectures",
                "Understand horizontal scaling, caching strategies, rate limiters, and message queues.",
                0,
            ),
            (
                "NextJS Production-Ready Frameworks",
                "Deep dive into App Router, Server Actions, Server Components, and static site caching.",
                0,
            ),
            (
                "Advanced SQL & Database Tunings",
                "Optimize queries, structure indexing, execute partitioning, and manage transactions.",
                1,
            ),
            (
                "Data Structures & Algorithms in Python",
                "Master dynamic programming, heap structures, tree graph travels, and complexities.",
                1,
            ),
            (
                "TailwindCSS Premium Web Design",
                "Build responsive landing pages using sleek minimal tokens and grid frameworks.",
                2,
            ),
            (
                "iOS Swift Development with SwiftUI",
                "Create production-ready native applications with reactive state and animations.",
                3,
            ),
            (
                "Introduction to Generative AI Systems",
                "Comprehensive foundations on NLP, transformer networks, and custom model tunings.",
                1,
            ),
            (
                "Redis Caching & Celery Workers",
                "Implement asynchronous background queues and in-memory caches in Django.",
                0,
            ),
            (
                "Mobile App Development with Flutter",
                "Build robust cross-platform mobile apps for Android and iOS using Dart.",
                3,
            ),
            (
                "Product Management for SaaS startups",
                "Determine product-market fit, layout user journeys, and define features.",
                2,
            ),
            (
                "React Native Immersive Workspaces",
                "Develop hybrid mobile apps, hook native modules, and manage layouts.",
                3,
            ),
            (
                "Financial Analytics & NumPy Charts",
                "Analyze time-series structures, calculate yields, and plot data frames.",
                1,
            ),
        ]

        for i, (title, desc, cat_idx) in enumerate(course_titles):
            course = Course.objects.create(
                title=title,
                slug=slugify(title),
                short_description=desc[:100],
                description=desc,
                category=categories[cat_idx],
                instructor=random.choice(instructors),
                difficulty=random.choice(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
                language="en",
                duration=random.randint(120, 1800),
                price=random.choice([49.99, 79.99, 99.99, 149.99]),
                status="PUBLISHED",
                visibility="PUBLIC",
                tags=["SaaS", "Demo", "Portfolio"],
                prerequisites=["Basic Programming"],
                learning_outcomes=["Professional competence", "Clean architectural separation"],
            )
            courses.append(course)

        # ==========================================
        # 6. CREATE SECTIONS & LESSONS (60+ Sections, 150+ Lessons)
        # ==========================================
        self.stdout.write("Creating Sections & Lessons...")
        lessons_pool = []
        for course in courses:
            # Create 3 sections per course
            for s in range(1, 4):
                section = Section.objects.create(
                    course=course, title=f"Module {s}: Core Architecture Foundations", order=s
                )

                # Create 3 lessons per section (total 9 lessons per course -> 189 total)
                for l in range(1, 4):
                    lesson = Lesson.objects.create(
                        section=section,
                        title=f"Lesson {l}: Implementing Systems & Tests",
                        description="Detailed lecture explaining implementation details and testing schemas.",
                        lesson_type="VIDEO",
                        duration=random.randint(5, 45),
                        video_url="https://res.cloudinary.com/demo/video/upload/dog.mp4",
                        content_text="This lesson outlines the architectural layout, core routing rules, and unit validation criteria.",
                        is_preview=(l == 1),
                        status="PUBLISHED",
                        order=l,
                    )
                    lessons_pool.append(lesson)

                    # Create 1 resource per lesson
                    LessonResource.objects.create(
                        lesson=lesson, title="Lecture Slides & Docs", file="resources/slides.pdf"
                    )

        # ==========================================
        # 7. CREATE QUIZZES & ASSIGNMENTS (40+ Quizzes, 25+ Assignments)
        # ==========================================
        self.stdout.write("Creating Quizzes & Assignments...")
        quizzes = []
        assignments = []

        # Deploy Quizzes to first 2 lessons of each section (2 per section -> 6 per course -> 126 total)
        for idx, lesson in enumerate(lessons_pool):
            if idx % 3 == 0:
                quiz = Quiz.objects.create(
                    course=lesson.section.course,
                    lesson=lesson,
                    title=f"Assessment: {lesson.title}",
                    description="Test your comprehension of the architectural components covered in this module.",
                    instructions="Answer all questions. Passing score is 70%.",
                    passing_percentage=70,
                    status="PUBLISHED",
                )
                quizzes.append(quiz)

                # Create 3 questions per quiz
                for q in range(1, 4):
                    question = Question.objects.create(
                        quiz=quiz,
                        question_type="SINGLE_CHOICE",
                        prompt=f"Question {q}: What is the primary purpose of separating the API interface from database models?",
                        explanation="This enforces clear boundary controls and separation of concerns.",
                        difficulty="INTERMEDIATE",
                        weight=10.0,
                        order=q,
                    )

                    # Create answer choices
                    AnswerOption.objects.create(
                        question=question, text="Better separation of concerns", is_correct=True, order=1
                    )
                    AnswerOption.objects.create(
                        question=question, text="Increased database speed", is_correct=False, order=2
                    )
                    AnswerOption.objects.create(question=question, text="None of the above", is_correct=False, order=3)

            # Deploy Assignments (25+ Assignments distributed)
            if idx % 7 == 0:
                assignment = Assignment.objects.create(
                    course=lesson.section.course,
                    lesson=lesson,
                    title=f"Practical Work: {lesson.title}",
                    instructions="Implement the requested repository module and push to a Git branch. Submit your repository link.",
                    due_date=timezone.now() + timedelta(days=7),
                    max_score=100,
                )
                assignments.append(assignment)

        # ==========================================
        # 8. ENROLLMENTS & USER PROGRESS
        # ==========================================
        self.stdout.write("Generating Enrollments & Progress logs...")

        # Standard Student enrollments
        for stud in students:
            # Enroll each student in 3-5 random courses
            enrolled_courses = random.sample(courses, random.randint(3, 5))
            for course in enrolled_courses:
                # 1. Create a paid order for the course to populate revenue stats
                price = course.price
                order = Order.objects.create(student=stud, total_amount=price, status=Order.Status.PAID)
                OrderItem.objects.create(order=order, course=course, price=price)

                # 2. Create the enrollment
                ratio = random.choice([0.10, 0.28, 0.43, 0.61, 0.84, 1.00])
                enrollment = Enrollment.objects.create(
                    student=stud,
                    course=course,
                    is_active=True,
                    completed_at=timezone.now() - timedelta(days=random.randint(1, 10)) if ratio == 1.00 else None,
                )

                # Complete some lessons to simulate realistic progress metrics
                course_lessons = Lesson.objects.filter(section__course=course)
                num_to_complete = int(len(course_lessons) * ratio)
                completed_lessons = random.sample(list(course_lessons), num_to_complete)

                for les in completed_lessons:
                    UserProgress.objects.create(
                        student=stud,
                        course=course,
                        lesson=les,
                        is_completed=True,
                        completed_at=timezone.now() - timedelta(days=random.randint(1, 15)),
                    )
                    WatchHistory.objects.create(
                        student=stud,
                        lesson=les,
                        last_position=random.randint(30, 200),
                        completion_percentage=100.0,
                        watch_time=random.randint(120, 1800),
                    )

        # ==========================================
        # 9. CERTIFICATES & REVIEWS (50+ Certificates, 150+ Reviews)
        # ==========================================
        self.stdout.write("Generating Certificates & Reviews...")

        # Certify some students who completed all course content
        for stud in students[:60]:
            # Choose a course they are enrolled in
            enrollment = Enrollment.objects.filter(student=stud).first()
            if enrollment:
                # Mark all lessons as completed to trigger certificate status eligibility
                course_lessons = Lesson.objects.filter(section__course=enrollment.course)
                for les in course_lessons:
                    UserProgress.objects.get_or_create(
                        student=stud,
                        course=enrollment.course,
                        lesson=les,
                        defaults={"is_completed": True, "completed_at": timezone.now()},
                    )

                Certificate.objects.create(
                    enrollment=enrollment,
                    student=stud,
                    course=enrollment.course,
                    certificate_id=f"CERT-{uuid.uuid4().hex[:8].upper()}",
                    issued_at=timezone.now() - timedelta(days=random.randint(1, 10)),
                    verification_url=f"/certificates/verify/SS-{uuid.uuid4().hex[:10].upper()}",
                )

        # Reviews (150+ reviews with ratings)
        review_contents = [
            "Excellent explanations with practical examples.",
            "The AI Tutor made difficult topics much easier.",
            "Great course structure and engaging assignments.",
            "Highly recommend for beginners.",
            "This course was absolutely phenomenal! Clear instructions and solid architectures.",
            "Decent course. Teaches production-grade workflows rather than basic hello-world setups.",
        ]

        reviewed_pairs = set()
        created_reviews_count = 0
        while created_reviews_count < 165:
            stud = random.choice(students)
            course = random.choice(courses)
            pair = (stud.id, course.id)
            if pair in reviewed_pairs:
                continue
            reviewed_pairs.add(pair)

            Review.objects.create(
                student=stud,
                course=course,
                rating=random.choice([4, 5, 5]),
                content=random.choice(review_contents),
                is_pinned=(created_reviews_count % 15 == 0),
            )
            created_reviews_count += 1

        # ==========================================
        # 10. QUIZ & ASSIGNMENT ATTEMPTS
        # ==========================================
        self.stdout.write("Generating Quiz & Assignment Attempts...")

        # Quiz Attempts
        for stud in students[:40]:
            for quiz in random.sample(quizzes, min(len(quizzes), 3)):
                QuizAttempt.objects.create(
                    quiz=quiz,
                    student=stud,
                    status="COMPLETED",
                    score=random.randint(70, 100),
                    percentage=random.randint(70, 100),
                    passed=True,
                    started_at=timezone.now() - timedelta(hours=2),
                    submitted_at=timezone.now() - timedelta(hours=1, minutes=45),
                )

        # Assignment Submissions
        for stud in students[:30]:
            for assignment in random.sample(assignments, min(len(assignments), 2)):
                AssignmentSubmission.objects.create(
                    assignment=assignment,
                    student=stud,
                    github_repo_url=f"https://github.com/{stud.username}/skillsphere-demo-repo",
                    text_submission="Implemented the repository files and structural abstractions as requested.",
                    status="GRADED",
                    score=random.randint(85, 100),
                    feedback="Solid work! Your module shows excellent encapsulation and decoupling.",
                    submitted_at=timezone.now() - timedelta(days=2),
                    graded_at=timezone.now() - timedelta(days=1),
                    graded_by=random.choice(instructors),
                )

        # ==========================================
        # 11. MESSAGING & NOTIFICATIONS
        # ==========================================
        self.stdout.write("Generating Chat Conversations...")

        # Messaging (100+ messages)
        for i in range(12):
            stud = random.choice(students)
            inst = random.choice(instructors)
            conv = Conversation.objects.create(student=stud, instructor=inst)

            # Add 8-10 messages per conversation
            for m in range(9):
                sender = stud if (m % 2 == 0) else inst
                Message.objects.create(
                    conversation=conv,
                    sender=sender,
                    content=(
                        "Hello! I had a quick question regarding custom Django middleware configuration."
                        if (m % 2 == 0)
                        else "Sure! Make sure you override both __init__ and __call__ methods and call the get_response delegate."
                    ),
                    is_read=True,
                    read_at=timezone.now(),
                )

        # ==========================================
        # 12. WISHLISTS & PAYOUTS
        # ==========================================
        self.stdout.write("Generating Payouts & Wishlists...")

        # Wishlists (50+ items)
        for _ in range(55):
            WishlistItem.objects.get_or_create(student=random.choice(students), course=random.choice(courses))

        # Payouts (simulate revenue analytics history)
        for inst in instructors:
            # 3 payouts per instructor
            for p in range(1, 4):
                Payout.objects.create(
                    instructor=inst,
                    amount=random.uniform(500.0, 4500.0),
                    status="PAID" if p < 3 else "PENDING",
                    initiated_at=timezone.now() - timedelta(days=p * 30),
                    paid_at=timezone.now() - timedelta(days=p * 30 - 2) if p < 3 else None,
                )

        # AI Conversations (Populate with previous AI Tutor conversations: React Hooks, Python Generators, Docker Networking, SQL Optimization, REST APIs)
        self.stdout.write("Generating previous AI Tutor conversations and Token Usages...")
        ai_topics = [
            (
                "React Hooks",
                [
                    {"role": "user", "content": "How do I prevent unnecessary rerenders when using React hooks?"},
                    {
                        "role": "assistant",
                        "content": "You can prevent unnecessary rerenders by utilizing: 1. React.memo to memoize functional components, 2. useCallback to memoize callback functions, and 3. useMemo to cache computed properties across renders.",
                    },
                ],
            ),
            (
                "Python Generators",
                [
                    {"role": "user", "content": "What is the difference between yield and return in Python?"},
                    {
                        "role": "assistant",
                        "content": "The 'return' statement terminates a function completely and returns a value. In contrast, 'yield' pauses the function, saves its state, and returns a generator iterator value, allowing you to resume execution later.",
                    },
                ],
            ),
            (
                "Docker Networking",
                [
                    {"role": "user", "content": "How do Docker containers communicate with each other?"},
                    {
                        "role": "assistant",
                        "content": "Docker containers communicate by joining the same user-defined bridge network. Once joined, they can reference each other using container names as hostnames via Docker's built-in DNS.",
                    },
                ],
            ),
            (
                "SQL Optimization",
                [
                    {"role": "user", "content": "How do I speed up a slow query joining three tables?"},
                    {
                        "role": "assistant",
                        "content": "To optimize a slow join: 1. Run EXPLAIN to locate bottlenecks, 2. Ensure foreign keys have indexes, 3. Retrieve only necessary columns rather than SELECT *, and 4. Denormalize highly critical paths if needed.",
                    },
                ],
            ),
            (
                "REST APIs",
                [
                    {"role": "user", "content": "What makes an API RESTful?"},
                    {
                        "role": "assistant",
                        "content": "An API is RESTful when it complies with architectural constraints: 1. Client-Server separation, 2. Statelessness, 3. Cacheability, 4. Uniform interface using HTTP verbs (GET, POST, PUT, DELETE), and 5. Layered system organization.",
                    },
                ],
            ),
        ]

        # Seed AI memory and Token Usage for some students
        for stud in students[:25]:
            for topic, messages in ai_topics:
                # Pick a random course enrolled by this student
                enroll = Enrollment.objects.filter(student=stud).first()
                if enroll:
                    ConversationMemory.objects.create(student=stud, course=enroll.course, history=messages)
                    # Create some mock token usage entries
                    TokenUsage.objects.create(
                        user=stud,
                        course=enroll.course,
                        feature_name="ai_tutor",
                        prompt_tokens=random.randint(150, 450),
                        completion_tokens=random.randint(200, 600),
                        total_tokens=random.randint(350, 1050),
                        estimated_cost=random.uniform(0.0005, 0.002),
                    )

        # Seed Notifications (Assignment graded, Certificate earned, New discussion reply, Course updated, New enrollment, Quiz available)
        self.stdout.write("Generating mock Notification alerts...")
        notification_templates = [
            ("Assignment Graded", "Your practical assignment has been graded. Score: 95/100.", "ASSIGNMENT_GRADED"),
            (
                "Certificate Earned!",
                "Congratulations! You have completed all course requirements and earned your certificate.",
                "CERTIFICATE_EARNED",
            ),
            ("New Discussion Reply", "An instructor replied to your comment in Section 2.", "NEW_DISCUSSION"),
            (
                "Course Materials Updated",
                "New learning resources and slides were added to the course workspace.",
                "COURSE_UPDATED",
            ),
            ("New Student Enrolled", "A new student enrolled in your course today.", "NEW_ENROLLMENT"),
            ("Quiz Available", "The module quiz for Section 4 is now open for submissions.", "QUIZ_AVAILABLE"),
        ]

        for stud in students[:50]:
            # Seed 3 random notifications for each student
            for title, msg, ntype in random.sample(notification_templates, 3):
                Notification.objects.create(
                    user=stud, title=title, message=msg, notification_type=ntype, read=random.choice([True, False])
                )

        # ==========================================
        # 13. ACHIEVEMENTS & BADGES
        # ==========================================
        self.stdout.write("Seeding Achievements...")
        badge_data = [
            ("First Step", "Enrolled in your first professional SkillSphere course.", "award", "PROGRESS"),
            ("Quiz Master", "Passed 5 module quizzes with a score above 85%.", "zap", "QUIZ"),
            (
                "Certified Graduate",
                "Completed all sections and generated a cryptographic completion certificate.",
                "award",
                "COURSE",
            ),
        ]

        badges = []
        for name, desc, icon, btype in badge_data:
            badge = Badge.objects.create(name=name, description=desc, icon=icon, badge_type=btype)
            badges.append(badge)

        # Award badges to students
        for stud in students[:50]:
            UserAchievement.objects.create(student=stud, badge=random.choice(badges))

        # ==========================================
        # 14. GRADEBOOK ENTRIES
        # ==========================================
        self.stdout.write("Generating Gradebook Entries...")
        for enrollment in Enrollment.objects.all():
            GradebookEntry.objects.update_or_create(
                enrollment=enrollment,
                defaults={
                    "student": enrollment.student,
                    "course": enrollment.course,
                    "quiz_average": random.uniform(70.0, 100.0),
                    "assignment_average": random.uniform(80.0, 100.0),
                    "overall_score": random.uniform(75.0, 98.0),
                    "grade_letter": random.choice(["A", "A-", "B+", "B", "C+"]),
                    "passed": True,
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo database successfully seeded!"))
