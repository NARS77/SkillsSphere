import os
from typing import Generator, Dict, Any
import google.generativeai as genai
from .base import AIProvider


class GeminiProvider(AIProvider):
    """
    Adapter implementing the AIProvider interface for Google's Gemini Models.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.is_active = bool(self.api_key)
        if self.is_active:
            genai.configure(api_key=self.api_key)
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    def generate(self, prompt: str, system_instruction: str = None, **kwargs) -> Dict[str, Any]:
        if not self.is_active:
            # Fall back to mock response behaviour if key is missing
            from .mock import MockProvider

            return MockProvider().generate(prompt, system_instruction, **kwargs)

        model = genai.GenerativeModel(model_name=self.model_name, system_instruction=system_instruction)
        response = model.generate_content(prompt)

        # Estimate tokens safely
        prompt_tokens = len(prompt.split()) * 2
        completion_text = response.text if response.text else ""
        completion_tokens = len(completion_text.split()) * 2

        return {"text": completion_text, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}

    def generate_stream(
        self, prompt: str, system_instruction: str = None, **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        if not self.is_active:
            from .mock import MockProvider

            yield from MockProvider().generate_stream(prompt, system_instruction, **kwargs)
            return

        model = genai.GenerativeModel(model_name=self.model_name, system_instruction=system_instruction)
        response = model.generate_content(prompt, stream=True)

        prompt_tokens = len(prompt.split()) * 2
        completion_tokens = 0

        for chunk in response:
            chunk_text = chunk.text if chunk.text else ""
            completion_tokens += len(chunk_text.split()) * 2
            yield {"text": chunk_text, "done": False, "prompt_tokens": 0, "completion_tokens": 0}

        yield {"text": "", "done": True, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}

    def get_token_count(self, text: str) -> int:
        return len(text.split()) * 2
