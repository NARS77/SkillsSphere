import os
from typing import Generator, Dict, Any
from .base import AIProvider


class ClaudeProvider(AIProvider):
    """
    Adapter implementing the AIProvider interface for Anthropic's Claude models.
    """

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.is_active = bool(self.api_key)
        self.model_name = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20240620")
        self.client = None
        if self.is_active:
            try:
                import anthropic

                self.client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                self.is_active = False

    def generate(self, prompt: str, system_instruction: str = None, **kwargs) -> Dict[str, Any]:
        if not self.is_active or not self.client:
            from .mock import MockProvider

            return MockProvider().generate(prompt, system_instruction, **kwargs)

        # Build Anthropic request params
        params = {
            "model": self.model_name,
            "max_tokens": kwargs.get("max_tokens", 1024),
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_instruction:
            params["system"] = system_instruction

        response = self.client.messages.create(**params)

        completion_text = response.content[0].text if response.content else ""
        prompt_tokens = response.usage.input_tokens if response.usage else len(prompt.split()) * 2
        completion_tokens = response.usage.output_tokens if response.usage else len(completion_text.split()) * 2

        return {"text": completion_text, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}

    def generate_stream(
        self, prompt: str, system_instruction: str = None, **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        if not self.is_active or not self.client:
            from .mock import MockProvider

            yield from MockProvider().generate_stream(prompt, system_instruction, **kwargs)
            return

        params = {
            "model": self.model_name,
            "max_tokens": kwargs.get("max_tokens", 1024),
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_instruction:
            params["system"] = system_instruction

        prompt_tokens = len(prompt.split()) * 2
        completion_tokens = 0

        with self.client.messages.stream(**params) as stream:
            for text in stream.text_stream:
                completion_tokens += len(text.split()) * 2
                yield {"text": text, "done": False, "prompt_tokens": 0, "completion_tokens": 0}

        yield {"text": "", "done": True, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}

    def get_token_count(self, text: str) -> int:
        return len(text.split()) * 2
