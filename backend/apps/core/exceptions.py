from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class DomainException(Exception):
    """Base exception for all domain logic failures."""

    message: str
    status_code: int

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundException(DomainException):
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class AuthenticationException(DomainException):
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class AuthorizationException(DomainException):
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class ValidationException(DomainException):
    def __init__(self, message: str, errors: dict = None):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)
        self.errors = errors or {}


def custom_exception_handler(exc, context):
    """
    Standardizes error responses to follow:
    {
        "error": {
            "message": "Error details",
            "code": "ExceptionClassName",
            "details": { ... }  # optional validation fields
        }
    }
    """
    response = exception_handler(exc, context)

    # Handle domain-specific custom exceptions
    if isinstance(exc, DomainException):
        data = {"error": {"message": exc.message, "code": exc.__class__.__name__}}
        if isinstance(exc, ValidationException) and exc.errors:
            data["error"]["details"] = exc.errors

        return Response(data, status=exc.status_code)

    # Restructure DRF native exceptions (e.g. ValidationError, PermissionDenied)
    if response is not None:
        message = "An error occurred."
        details = None
        code = "APIError"

        if response.status_code == 400:
            code = "ValidationError"
            message = "Input validation failed."
            if isinstance(response.data, dict):
                if "detail" in response.data:
                    message = response.data["detail"]
                else:
                    details = response.data
            elif isinstance(response.data, list):
                details = {"non_field_errors": response.data}
        elif response.status_code == 401:
            code = "AuthenticationError"
            message = response.data.get("detail", "Authentication credentials were not provided or are invalid.")
        elif response.status_code == 403:
            code = "PermissionDenied"
            message = response.data.get("detail", "You do not have permission to perform this action.")
        elif response.status_code == 404:
            code = "NotFound"
            message = response.data.get("detail", "The requested resource was not found.")
        elif response.status_code == 429:
            code = "Throttled"
            message = response.data.get("detail", "Too many requests. Please try again later.")
        else:
            if isinstance(response.data, dict) and "detail" in response.data:
                message = response.data["detail"]

        data = {"error": {"message": message, "code": code}}
        if details:
            data["error"]["details"] = details

        response.data = data

    return response
