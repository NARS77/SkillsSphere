import os
import requests
from typing import Generator, Dict, Any
from .base import AIProvider


class OllamaProvider(AIProvider):
    """
    Adapter implementing the AIProvider interface for locally hosted Ollama services.
    """

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.model_name = os.getenv("OLLAMA_MODEL", "llama3")
        # Check active status by querying the local Ollama API status
        self.is_active = False
        try:
            res = requests.get(f"{self.base_url}/api/tags", timeout=1.5)
            if res.status_code == 200:
                self.is_active = True
        except Exception:
            pass

    def generate(self, prompt: str, system_instruction: str = None, **kwargs) -> Dict[str, Any]:
        if not self.is_active:
            from .mock import MockProvider

            return MockProvider().generate(prompt, system_instruction, **kwargs)

        payload = {"model": self.model_name, "prompt": prompt, "stream": False}
        if system_instruction:
            payload["system"] = system_instruction

        try:
            res = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=30)
            if res.status_code == 200:
                data = res.json()
                completion_text = data.get("response", "")
                prompt_tokens = data.get("prompt_eval_count", len(prompt.split()) * 2)
                completion_tokens = data.get("eval_count", len(completion_text.split()) * 2)
                return {"text": completion_text, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}
        except Exception:
            pass

        from .mock import MockProvider

        return MockProvider().generate(prompt, system_instruction, **kwargs)

    def generate_stream(
        self, prompt: str, system_instruction: str = None, **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        if not self.is_active:
            from .mock import MockProvider

            yield from MockProvider().generate_stream(prompt, system_instruction, **kwargs)
            return

        payload = {"model": self.model_name, "prompt": prompt, "stream": True}
        if system_instruction:
            payload["system"] = system_instruction

        prompt_tokens = len(prompt.split()) * 2
        completion_tokens = 0

        try:
            res = requests.post(f"{self.base_url}/api/generate", json=payload, stream=True, timeout=30)
            if res.status_code == 200:
                import json

                for line in res.iter_lines():
                    if line:
                        data = json.loads(line.decode("utf-8"))
                        chunk_text = data.get("response", "")
                        completion_tokens += len(chunk_text.split()) * 2
                        yield {"text": chunk_text, "done": False, "prompt_tokens": 0, "completion_tokens": 0}
                        if data.get("done", False):
                            prompt_tokens = data.get("prompt_eval_count", prompt_tokens)
                            completion_tokens = data.get("eval_count", completion_tokens)

                yield {"text": "", "done": True, "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}
                return
        except Exception:
            pass

        from .mock import MockProvider

        yield from MockProvider().generate_stream(prompt, system_instruction, **kwargs)

    def get_token_count(self, text: str) -> int:
        return len(text.split()) * 2
