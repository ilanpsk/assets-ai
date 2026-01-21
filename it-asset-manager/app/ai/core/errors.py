import logging
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Try importing OpenAI exceptions
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# Try importing Google exceptions
try:
    from google.api_core import exceptions as google_exceptions
    HAS_GOOGLE = True
except ImportError:
    HAS_GOOGLE = False

# Try importing Anthropic exceptions (optional, if added later)
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


def normalize_ai_exception(
    exc: Exception,
    *,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    request_id: Optional[str] = None,
) -> Tuple[int, Dict[str, Any]]:
    """
    Normalize various AI provider exceptions into a standard HTTP status code and detail dict.
    
    Returns:
        (status_code, detail_dict)
        
    detail_dict structure:
        {
            "code": "ai_rate_limit" | "ai_request_too_large" | ...,
            "message": "User friendly message",
            "request_id": "...",
            "provider": "openai" (optional, internal use mostly),
            "model": "gpt-4" (optional)
        }
    """
    
    # Defaults
    status_code = 500
    code = "ai_unknown_error"
    message = "An unexpected error occurred while processing your request."
    
    # 1. OpenAI Handling
    if HAS_OPENAI:
        if isinstance(exc, openai.RateLimitError):
            status_code = 429
            code = "ai_rate_limit"
            message = f"Rate limit exceeded for model {model or 'unknown'}. Please try again later."
        elif isinstance(exc, openai.BadRequestError):
            # This often covers context length exceeded
            status_code = 400
            code = "ai_request_too_large"
            message = "The request was too large or invalid for the AI model."
            if "context_length" in str(exc):
                message = "The conversation history is too long for this model. Please clear the chat or use a model with a larger context window."
        elif isinstance(exc, openai.AuthenticationError):
            status_code = 500 # Don't return 401/403 to user as it's a server config issue
            code = "ai_auth_error"
            message = "AI service configuration error (Authentication). Please contact support."
        elif isinstance(exc, openai.APIConnectionError):
            status_code = 503
            code = "ai_connection_error"
            message = "Could not connect to the AI service. Please check your internet connection or try again later."
        elif isinstance(exc, openai.APIStatusError):
            status_code = exc.status_code
            code = "ai_api_error"
            message = f"AI provider returned an error: {exc.message}"

    # 2. Google Handling
    if HAS_GOOGLE:
        if isinstance(exc, google_exceptions.ResourceExhausted):
            status_code = 429
            code = "ai_rate_limit"
            message = f"Rate limit exceeded for model {model or 'unknown'}."
        elif isinstance(exc, google_exceptions.InvalidArgument):
            status_code = 400
            code = "ai_invalid_argument"
            message = "Invalid request parameters sent to AI provider."
        elif isinstance(exc, (google_exceptions.Unauthenticated, google_exceptions.PermissionDenied)):
            status_code = 500
            code = "ai_auth_error"
            message = "AI service configuration error."
        elif isinstance(exc, google_exceptions.DeadlineExceeded):
            status_code = 504
            code = "ai_timeout"
            message = "The AI service request timed out."
        elif isinstance(exc, google_exceptions.ServiceUnavailable):
            status_code = 503
            code = "ai_unavailable"
            message = "The AI service is currently unavailable."

    # 3. Anthropic Handling (Placeholder)
    if HAS_ANTHROPIC:
         if isinstance(exc, anthropic.RateLimitError):
            status_code = 429
            code = "ai_rate_limit"
            message = "Rate limit exceeded."
         # Add more as needed

    # 4. Generic/Fallback Handling
    # If we haven't matched a specific type yet, or if libraries are missing but exceptions bubble up differently
    if status_code == 500:
        exc_str = str(exc).lower()
        exc_name = type(exc).__name__.lower()
        
        if "ratelimit" in exc_name or "rate limit" in exc_str or getattr(exc, "status_code", 0) == 429:
            status_code = 429
            code = "ai_rate_limit"
            message = "Rate limit exceeded (generic)."
        
        elif "context_length" in exc_str or "maximum context" in exc_str or "token limit" in exc_str:
            status_code = 400
            code = "ai_request_too_large"
            message = "The request exceeds the model's context length."
            
        elif "timeout" in exc_name or "timed out" in exc_str:
            status_code = 504
            code = "ai_timeout"
            message = "Request timed out."
            
        elif getattr(exc, "status_code", 0) == 503:
            status_code = 503
            code = "ai_unavailable"
            message = "AI Service temporarily unavailable."

    return status_code, {
        "code": code,
        "message": message,
        "request_id": request_id,
        "provider": provider,  # Optional: consider removing if you want to be very strict about leaking internals
        "model": model
    }


