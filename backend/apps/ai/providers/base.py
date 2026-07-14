from abc import ABC, abstractmethod
from typing import Generator, Dict, Any


class AIProvider(ABC):
    """
    Abstract Base Class outlining standard methods for all LLM providers (Gemini, OpenAI, Mock, etc.).
    """

    @abstractmethod
    def generate(self, prompt: str, system_instruction: str = None, **kwargs) -> Dict[str, Any]:
        """
        Executes a single synchronous generation query, returning:
        {
            'text': str,
            'prompt_tokens': int,
            'completion_tokens': int
        }
        """
        pass

    @abstractmethod
    def generate_stream(
        self, prompt: str, system_instruction: str = None, **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Yields text chunks and final metadata counts in a streaming generation:
        Yields:
        {
            'text': str,
            'done': bool,
            'prompt_tokens': int,
            'completion_tokens': int
        }
        """
        pass

    @abstractmethod
    def get_token_count(self, text: str) -> int:
        """
        Calculates estimate token counts for billing quotas.
        """
        pass
