import logging
from .base import BaseSearchEngine
from .keyword import DatabaseKeywordSearchEngine

logger = logging.getLogger(__name__)

class SemanticSearchEngine(BaseSearchEngine):
    """
    Mock/Pluggable Semantic Search Engine that integrates vector embeddings.
    Falls back to Keyword searches in local setup.
    """
    def __init__(self):
        self.fallback = DatabaseKeywordSearchEngine()

    def search(self, query: str, user=None, **kwargs) -> dict:
        logger.info(f"Executing semantic vector embeddings search for query: '{query}'")
        # In a full vector database integration (e.g. pgvector, Pinecone), we would compute embeddings
        # and execute cosine similarity query. We fall back to the Keyword search engine.
        return self.fallback.search(query, user, **kwargs)
