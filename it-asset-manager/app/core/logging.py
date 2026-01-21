import logging
import sys
import time
import functools
import inspect
from contextvars import ContextVar
from typing import Optional
from uuid import uuid4

# Context variable to hold the Request ID
request_id_ctx_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

# Context variable to hold the Audit Origin (e.g. "ai", "human", "system")
audit_origin_ctx_var: ContextVar[Optional[str]] = ContextVar("audit_origin", default=None)

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        request_id = request_id_ctx_var.get()
        record.request_id = request_id or "-"
        return True

def setup_logging():
    root = logging.getLogger()
    if root.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    
    # Detailed text formatter including request_id
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | [%(request_id)s] | %(name)s:%(lineno)d | %(message)s",
        "%Y-%m-%d %H:%M:%S",
    )
    
    handler.setFormatter(formatter)
    handler.addFilter(RequestIdFilter())
    
    root.addHandler(handler)
    
    # Set default level
    root.setLevel(logging.INFO)
    
    # Silence noisy libraries if needed
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Ensure app logger is at DEBUG if needed
    logging.getLogger("app").setLevel(logging.INFO)

def log_activity(func):
    """
    Decorator to log function entry, exit, and execution time.
    Handles both sync and async functions.
    """
    logger = logging.getLogger("app.activity")

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__qualname__
        
        # Sanitize kwargs for logging (avoid large objects or secrets if possible)
        # For now, simple logging
        try:
            logger.info(f"START {func_name} | args={args} kwargs={kwargs}")
            result = await func(*args, **kwargs)
            process_time = (time.time() - start_time) * 1000
            logger.info(f"END   {func_name} | duration={process_time:.2f}ms")
            return result
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(f"FAIL  {func_name} | duration={process_time:.2f}ms | error={str(e)}", exc_info=True)
            raise e

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__qualname__
        
        try:
            logger.info(f"START {func_name} | args={args} kwargs={kwargs}")
            result = func(*args, **kwargs)
            process_time = (time.time() - start_time) * 1000
            logger.info(f"END   {func_name} | duration={process_time:.2f}ms")
            return result
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(f"FAIL  {func_name} | duration={process_time:.2f}ms | error={str(e)}", exc_info=True)
            raise e

    if inspect.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper
