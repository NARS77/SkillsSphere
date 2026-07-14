from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DemoModeMiddleware:
    """
    Middleware that intercepts and rejects destructive operations in Demo Mode.
    Specifically blocks:
    - All HTTP DELETE requests.
    - POST/PUT/PATCH requests targeting user/profile deletion/deactivation.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(settings, 'DEMO_MODE', False):
            # Identify request paths and methods
            method = request.method.upper()
            path = request.path.lower()

            is_delete_method = (method == 'DELETE')
            is_deactivate_endpoint = (method in ['POST', 'PUT', 'PATCH']) and ('profile/delete' in path)

            if is_delete_method or is_deactivate_endpoint:
                logger.warning(f"DemoModeMiddleware: Rejection of destructive {method} request to '{request.path}'")
                return JsonResponse(
                    {"error": "This destructive action is disabled in Demo Mode."},
                    status=403
                )

        return self.get_response(request)
