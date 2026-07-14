import logging
from typing import Any, Optional, List
from django.core.cache import cache

logger = logging.getLogger(__name__)


class CacheService:
    """
    Central Service managing application caching, invalidation, versioning, and tagging.
    """

    VERSION = 1  # Global Cache versioning key to invalidate schemas upon deployments

    @classmethod
    def get_key(cls, key: str) -> str:
        """
        Appends global namespace version prefix to cache key.
        """
        return f"v{cls.VERSION}:{key}"

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """
        Fetches an item from the cache.
        """
        full_key = cls.get_key(key)
        value = cache.get(full_key)
        if value is not None:
            logger.debug(f"Cache HIT for key: {full_key}")
        else:
            logger.debug(f"Cache MISS for key: {full_key}")
        return value

    @classmethod
    def set(cls, key: str, value: Any, timeout: int = 3600, tags: List[str] = None) -> bool:
        """
        Saves value in cache and registers it under any provided tags.
        """
        full_key = cls.get_key(key)
        success = cache.set(full_key, value, timeout)

        if success and tags:
            for tag in tags:
                cls._register_tag(tag, full_key)
        return success

    @classmethod
    def delete(cls, key: str) -> bool:
        """
        Explicit key invalidation.
        """
        full_key = cls.get_key(key)
        return cache.delete(full_key)

    @classmethod
    def invalidate_tag(cls, tag: str) -> None:
        """
        Invalidates all cache keys registered under a specific tag.
        """
        tag_key = f"tag:{tag}"
        keys = cache.get(tag_key, [])
        if keys:
            logger.info(f"Invalidating {len(keys)} cached keys registered under tag: '{tag}'")
            cache.delete_many(keys)
            cache.delete(tag_key)

    @classmethod
    def _register_tag(cls, tag: str, full_key: str) -> None:
        """
        Registers a cache key under a tag dictionary tracking list.
        """
        tag_key = f"tag:{tag}"
        keys = cache.get(tag_key, [])
        if full_key not in keys:
            keys.append(full_key)
            cache.set(tag_key, keys, timeout=86400 * 30)  # Preserve tag keys mapping for 30 days
