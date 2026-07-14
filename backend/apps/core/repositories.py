from typing import Type, TypeVar, Generic, List, Optional, Any
from django.db import models
from django.core.exceptions import ObjectDoesNotExist

M = TypeVar("M", bound=models.Model)


class BaseRepository(Generic[M]):
    """
    Base repository class encapsulating common database retrieval and modification queries.
    """

    model: Type[M]

    def __init__(self, model: Type[M]):
        self.model = model

    def get_query_set(self) -> models.QuerySet:
        return self.model.objects.all()

    def get_all(self) -> List[M]:
        return list(self.get_query_set())

    def get_by_id(self, pk: Any) -> Optional[M]:
        try:
            return self.model.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return None

    def get_by_id_or_raise(self, pk: Any, exception_class: Type[Exception] = ValueError) -> M:
        instance = self.get_by_id(pk)
        if not instance:
            raise exception_class(f"{self.model.__name__} with id {pk} does not exist.")
        return instance

    def filter(self, **kwargs: Any) -> models.QuerySet:
        return self.model.objects.filter(**kwargs)

    def create(self, **kwargs: Any) -> M:
        return self.model.objects.create(**kwargs)

    def update(self, instance: M, **kwargs: Any) -> M:
        for attr, value in kwargs.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def delete(self, instance: M) -> None:
        instance.delete()

    def save(self, instance: M) -> M:
        instance.save()
        return instance


from .models import Notification


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    def get_user_notifications(self, user) -> models.QuerySet:
        return self.model.objects.filter(user=user)

    def mark_all_read(self, user) -> int:
        return self.model.objects.filter(user=user, read=False).update(read=True)
