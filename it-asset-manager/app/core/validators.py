from typing import Annotated
import bleach
from pydantic import BeforeValidator

def sanitize_text(v: str | None) -> str | None:
    if v is None:
        return None
    return bleach.clean(v, tags=[], attributes={}, strip=True)

SanitizedString = Annotated[str, BeforeValidator(sanitize_text)]




