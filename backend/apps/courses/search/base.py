from abc import ABC, abstractmethod

class BaseSearchEngine(ABC):
    """
    Interface outlining standard methods for all Search Engines (Keyword, Semantic, etc.).
    """
    @abstractmethod
    def search(self, query: str, user=None, **kwargs) -> dict:
        """
        Returns structured search matches:
        {
            'courses': [...],
            'lessons': [...],
            'discussions': [...],
            'instructors': [...]
        }
        """
        pass
