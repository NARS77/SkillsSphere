import os
from typing import List, Dict, Any
from .keyword import DatabaseKeywordSearchEngine
from .semantic import SemanticSearchEngine

class SearchService:
    """
    Search Service acting as entrypoint, selecting the search provider,
    ranking hits, and formatting payloads into standardized schemas.
    """
    def __init__(self):
        provider = os.getenv('SEARCH_PROVIDER', 'keyword').lower()
        if provider == 'semantic':
            self.engine = SemanticSearchEngine()
        else:
            self.engine = DatabaseKeywordSearchEngine()

    def search_all(self, query: str, user=None) -> Dict[str, List[Dict[str, Any]]]:
        raw_results = self.engine.search(query, user)
        
        # Result Formatting
        return {
            'courses': self._format_courses(raw_results.get('courses', [])),
            'lessons': self._format_lessons(raw_results.get('lessons', [])),
            'discussions': self._format_discussions(raw_results.get('discussions', [])),
            'instructors': self._format_instructors(raw_results.get('instructors', []))
        }

    def _format_courses(self, courses) -> List[Dict[str, Any]]:
        return [{
            'id': str(c.id),
            'title': c.title,
            'slug': c.slug,
            'short_description': c.short_description,
            'price': float(c.price),
            'rating': float(c.rating) if hasattr(c, 'rating') else 5.0
        } for c in courses]

    def _format_lessons(self, lessons) -> List[Dict[str, Any]]:
        return [{
            'id': str(l.id),
            'title': l.title,
            'lesson_type': l.lesson_type,
            'course_slug': l.section.course.slug,
            'course_title': l.section.course.title
        } for l in lessons]

    def _format_discussions(self, threads) -> List[Dict[str, Any]]:
        return [{
            'id': str(d.id),
            'title': d.title,
            'content': d.content[:100],
            'course_slug': d.course.slug,
            'course_title': d.course.title
        } for d in threads]

    def _format_instructors(self, instructors) -> List[Dict[str, Any]]:
        return [{
            'id': str(i.id),
            'username': i.username,
            'name': f"{i.first_name} {i.last_name}".strip() or i.username,
            'headline': getattr(i, 'headline', 'Instructor at SkillSphere')
        } for i in instructors]
