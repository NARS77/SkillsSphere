from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.authentication.models import Profile

User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse("auth_register")
        self.login_url = reverse("auth_login")
        self.profile_url = reverse("auth_profile")

        self.user_data = {
            "username": "teststudent",
            "email": "student@skillsphere.com",
            "password": "Password123!",
            "role": "STUDENT",
            "accept_terms": True,
        }

    def test_user_registration_success(self):
        """Verify new users can register and receive JWT tokens."""
        response = self.client.post(self.register_url, self.user_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Look up verification OTP code from Django cache
        from django.core.cache import cache

        pending = cache.get(f"pending_reg_email_{self.user_data['email']}")
        self.assertIsNotNone(pending)
        otp = pending["otp"]

        # Complete registration verification step
        verify_url = reverse("auth_register_verify")
        response = self.client.post(verify_url, {"email": self.user_data["email"], "code": otp}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("user", response.data)
        self.assertIn("tokens", response.data)
        self.assertEqual(response.data["user"]["email"], self.user_data["email"])

        # Verify database record exists
        user = User.objects.get(email=self.user_data["email"])
        self.assertEqual(user.username, self.user_data["username"])
        self.assertEqual(user.role, "STUDENT")

        # Verify profile was automatically created via signal
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_user_registration_duplicate_email(self):
        """Verify system prevents registration with an existing email."""
        # Register first user
        self.client.post(self.register_url, self.user_data, format="json")
        from django.core.cache import cache

        otp = cache.get(f"pending_reg_email_{self.user_data['email']}")["otp"]
        self.client.post(
            reverse("auth_register_verify"), {"email": self.user_data["email"], "code": otp}, format="json"
        )

        # Try to register duplicate
        duplicate_data = self.user_data.copy()
        duplicate_data["username"] = "differentuser"
        response = self.client.post(self.register_url, duplicate_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"]["code"], "ValidationException")

    def test_user_login_success(self):
        """Verify users can authenticate and receive JWT tokens."""
        # Create user
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        login_credentials = {"email": self.user_data["email"], "password": self.user_data["password"]}

        response = self.client.post(self.login_url, login_credentials, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])

    def test_user_login_invalid_credentials(self):
        """Verify invalid logins are rejected with clear error message."""
        login_credentials = {"email": self.user_data["email"], "password": "WrongPassword123!"}
        response = self.client.post(self.login_url, login_credentials, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"]["code"], "AuthenticationException")

    def test_get_profile_requires_authentication(self):
        """Verify unauthorized requests to profile endpoint are blocked."""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_profile_success(self):
        """Verify authenticated users can retrieve their profiles."""
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        # Authenticate client
        response = self.client.post(
            self.login_url, {"email": self.user_data["email"], "password": self.user_data["password"]}, format="json"
        )

        token = response.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Fetch profile
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["user"]["email"], self.user_data["email"])
        self.assertIn("headline", profile_response.data)

    def test_registration_requires_terms_acceptance(self):
        """Verify registration fails if terms are not accepted."""
        data = self.user_data.copy()
        data["accept_terms"] = False
        data["username"] = "noterms"
        data["email"] = "noterms@skillsphere.com"
        response = self.client.post(self.register_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accept_terms", response.data["error"]["details"])

    def test_email_verification_flow(self):
        """Verify registering sends token and verifying token activates user email."""
        # Register user (step 1)
        response = self.client.post(self.register_url, self.user_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify db user does NOT exist yet
        self.assertFalse(User.objects.filter(email=self.user_data["email"]).exists())

        # Find verification token in cache
        from django.core.cache import cache

        pending = cache.get(f"pending_reg_email_{self.user_data['email']}")
        self.assertIsNotNone(pending)
        otp = pending["otp"]

        # Hit verify endpoint (step 2 via email link GET)
        verify_url = reverse("auth_email_verify")
        response = self.client.get(f"{verify_url}?token={otp}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user is now created in DB and is verified
        user = User.objects.get(email=self.user_data["email"])
        self.assertTrue(user.is_verified)

    def test_password_reset_flow(self):
        """Verify password reset requests generate tokens and confirming them changes password."""
        # Create user
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        # Request password reset
        reset_req_url = reverse("auth_password_reset_request")
        response = self.client.post(reset_req_url, {"email": user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find password reset token in db
        from apps.authentication.models import PasswordResetToken

        token_obj = PasswordResetToken.objects.get(user=user)

        # Confirm password reset
        reset_confirm_url = reverse("auth_password_reset_confirm")
        response = self.client.post(
            reset_confirm_url, {"token": token_obj.token, "password": "NewSecurePassword123!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check login works with new password
        response = self.client.post(
            self.login_url, {"email": user.email, "password": "NewSecurePassword123!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_session_blacklisting_revocation(self):
        """Verify logging in creates a session and revoking it invalidates JWT token."""
        # Create user
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        # Log in to get tokens & create session
        response = self.client.post(
            self.login_url, {"email": user.email, "password": self.user_data["password"]}, format="json"
        )

        tokens = response.data["tokens"]
        access_token = tokens["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Get active sessions
        sessions_url = reverse("auth_user_sessions")
        response = self.client.get(sessions_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        session_id = response.data[0]["id"]

        # Revoke the session
        response = self.client.post(sessions_url, {"action": "revoke", "session_id": session_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Try to refresh using the revoked token, should be blacklisted
        refresh_url = reverse("token_refresh")
        response = self.client.post(refresh_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_account_deactivation(self):
        """Verify accounts can be deactivated (soft delete) and invalidates current login sessions."""
        # Create user
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        # Log in
        response = self.client.post(
            self.login_url, {"email": user.email, "password": self.user_data["password"]}, format="json"
        )

        tokens = response.data["tokens"]
        access_token = tokens["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Deactivate
        deactivate_url = reverse("auth_profile_delete")
        response = self.client.post(
            deactivate_url, {"password": self.user_data["password"], "feedback": "Decided to leave"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user is deactivated
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertIsNotNone(user.deleted_at)
        self.assertEqual(user.deletion_feedback, "Decided to leave")

    def test_data_export(self):
        """Verify data export generates a valid ZIP response."""
        # Create user
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            password=self.user_data["password"],
            role=self.user_data["role"],
        )

        # Log in
        response = self.client.post(
            self.login_url, {"email": user.email, "password": self.user_data["password"]}, format="json"
        )

        tokens = response.data["tokens"]
        access_token = tokens["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Export data
        export_url = reverse("auth_profile_export")
        response = self.client.get(export_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/zip")
        self.assertTrue(response["Content-Disposition"].startswith("attachment; filename="))
