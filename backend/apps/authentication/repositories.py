from typing import Optional
from apps.core.repositories import BaseRepository
from .models import User, Profile


class UserRepository(BaseRepository[User]):
    """
    Repository for managing User database operations.
    """

    def __init__(self):
        super().__init__(User)

    def get_by_email(self, email: str) -> Optional[User]:
        try:
            return self.model.objects.get(email__iexact=email)
        except self.model.DoesNotExist:
            return None

    def email_exists(self, email: str) -> bool:
        return self.model.objects.filter(email__iexact=email).exists()

    def username_exists(self, username: str) -> bool:
        return self.model.objects.filter(username__iexact=username).exists()


class ProfileRepository(BaseRepository[Profile]):
    """
    Repository for managing Profile database operations.
    """

    def __init__(self):
        super().__init__(Profile)

    def get_by_user_id(self, user_id: str) -> Optional[Profile]:
        try:
            return self.model.objects.get(user_id=user_id)
        except self.model.DoesNotExist:
            return None
