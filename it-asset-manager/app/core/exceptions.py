class AppException(Exception):
    """Base exception for application errors."""
    def __init__(self, message: str, original_exception: Exception = None):
        super().__init__(message)
        self.message = message
        self.original_exception = original_exception

class ResourceNotFound(AppException):
    """Raised when a requested resource is not found."""
    pass

class DuplicateResource(AppException):
    """Raised when creating a resource that already exists."""
    pass

class ValidationException(AppException):
    """Raised when domain validation fails."""
    pass

class PermissionDenied(AppException):
    """Raised when user does not have permission."""
    pass

class AuthenticationError(AppException):
    """Raised when authentication fails."""
    pass

