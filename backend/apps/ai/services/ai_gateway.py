import os
import datetime
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
from apps.core.exceptions import ValidationException
from apps.ai.models import TokenUsage, AICache, AIQuota
from apps.ai.providers.mock import MockProvider
from apps.ai.providers.gemini import GeminiProvider
from apps.ai.providers.openai import OpenAIProvider
from apps.ai.providers.claude import ClaudeProvider
from apps.ai.providers.ollama import OllamaProvider


class AIGateway:
    """
    Central gateway coordinating prompt execution, token usage tracking,
    caching, rate limiting, and provider adapter selection.
    """

    def __init__(self):
        # Read active provider from environment variable
        self.provider_name = os.getenv("AI_PROVIDER", "mock").lower()
        if self.provider_name == "gemini":
            self.provider = GeminiProvider()
        elif self.provider_name == "openai":
            self.provider = OpenAIProvider()
        elif self.provider_name == "claude":
            self.provider = ClaudeProvider()
        elif self.provider_name == "ollama":
            self.provider = OllamaProvider()
        else:
            self.provider = MockProvider()

    def _verify_quota(self, user):
        """
        Validates daily credit limits for students.
        """
        if user.role == "ADMIN":
            return  # Admins have unlimited access

        today = datetime.date.today()
        quota, created = AIQuota.objects.get_or_create(student=user)

        # Reset quota count if date changes
        if quota.last_reset != today:
            quota.daily_request_count = 0
            quota.daily_token_count = 0
            quota.last_reset = today
            quota.save()

        # Enforce limits (e.g. 50 requests per day)
        daily_max_requests = int(os.getenv("AI_DAILY_MAX_REQUESTS", "50"))
        if quota.daily_request_count >= daily_max_requests:
            raise ValidationException(
                f"Daily AI request limit reached ({daily_max_requests} requests). " "Please try again tomorrow."
            )

    def _log_token_usage(self, user, course, feature_name, prompt_tokens, completion_tokens):
        """
        Logs token counts and updates daily usage records.
        """
        total = prompt_tokens + completion_tokens
        if total <= 0:
            return

        # Estimate API costs: $0.000002 per token as baseline
        cost_rate = Decimal(os.getenv("AI_COST_PER_TOKEN", "0.000002"))
        estimated_cost = Decimal(total) * cost_rate

        # 1. Create audit record
        TokenUsage.objects.create(
            user=user,
            course=course,
            feature_name=feature_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total,
            estimated_cost=estimated_cost,
        )

        # 2. Update daily quota stats
        try:
            quota = AIQuota.objects.get(student=user)
            quota.daily_request_count += 1
            quota.daily_token_count += total
            quota.save()
        except AIQuota.DoesNotExist:
            pass

    def execute_prompt(self, user, course, feature_name, prompt, system_instruction=None, bypass_cache=False) -> str:
        """
        Synchronous prompt execution with caching and billing quotas tracking.
        """
        self._verify_quota(user)

        # Check Cache
        cache_key = f"{feature_name}:{hash(prompt + (system_instruction or ''))}"
        if not bypass_cache:
            cache_entry = AICache.objects.filter(cache_key=cache_key).first()
            if cache_entry and (not cache_entry.expires_at or cache_entry.expires_at > timezone.now()):
                return cache_entry.response_text

        # Call Provider
        result = self.provider.generate(prompt, system_instruction)

        # Log Tokens
        self._log_token_usage(
            user=user,
            course=course,
            feature_name=feature_name,
            prompt_tokens=result["prompt_tokens"],
            completion_tokens=result["completion_tokens"],
        )

        # Write Cache (expires in 12 hours)
        expires = timezone.now() + timezone.timedelta(hours=12)
        AICache.objects.update_or_create(
            cache_key=cache_key, defaults={"response_text": result["text"], "expires_at": expires}
        )

        return result["text"]

    def execute_stream(self, user, course, feature_name, prompt, system_instruction=None):
        """
        Generator yielding text chunks, updating quota counts on completion.
        """
        self._verify_quota(user)

        stream = self.provider.generate_stream(prompt, system_instruction)

        for chunk in stream:
            if chunk["done"]:
                # Save usage metrics on final chunk
                self._log_token_usage(
                    user=user,
                    course=course,
                    feature_name=feature_name,
                    prompt_tokens=chunk["prompt_tokens"],
                    completion_tokens=chunk["completion_tokens"],
                )
            yield chunk["text"]
