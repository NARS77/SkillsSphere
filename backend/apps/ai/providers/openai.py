import os
from typing import Generator, Dict, Any
from .base import AIProvider

class OpenAIProvider(AIProvider):
    """
    Adapter implementing the AIProvider interface for OpenAI's GPT models.
    """
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.is_active = bool(self.api_key)
        self.model_name = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        self.client = None
        if self.is_active:
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
            except ImportError:
                self.is_active = False

    def generate(self, prompt: str, system_instruction: str = None, **kwargs) -> Dict[str, Any]:
        if not self.is_active or not self.client:
            from .mock import MockProvider
            return MockProvider().generate(prompt, system_instruction, **kwargs)

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            **kwargs
        )
        
        completion_text = response.choices[0].message.content or ''
        prompt_tokens = response.usage.prompt_tokens if response.usage else len(prompt.split()) * 2
        completion_tokens = response.usage.completion_tokens if response.usage else len(completion_text.split()) * 2

        return {
            'text': completion_text,
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens
        }

    def generate_stream(self, prompt: str, system_instruction: str = None, **kwargs) -> Generator[Dict[str, Any], None, None]:
        if not self.is_active or not self.client:
            from .mock import MockProvider
            yield from MockProvider().generate_stream(prompt, system_instruction, **kwargs)
            return

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            stream=True,
            **kwargs
        )

        prompt_tokens = len(prompt.split()) * 2
        completion_tokens = 0

        for chunk in response:
            delta = chunk.choices[0].delta if chunk.choices else None
            chunk_text = delta.content if delta and delta.content else ''
            completion_tokens += len(chunk_text.split()) * 2
            yield {
                'text': chunk_text,
                'done': False,
                'prompt_tokens': 0,
                'completion_tokens': 0
            }

        yield {
            'text': '',
            'done': True,
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens
        }

    def get_token_count(self, text: str) -> int:
        return len(text.split()) * 2
