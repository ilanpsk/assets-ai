from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import Dict, Any

class InspectFileInput(BaseModel):
    file_path: str = Field(description="The full path to the file to inspect")

@tool("inspect_file", args_schema=InspectFileInput)
def inspect_file(file_path: str) -> Dict[str, Any]:
    """
    Reads the first few rows of a CSV, Excel, or JSON file to understand its structure and headers.
    Use this to 'see' what is in a file before importing it.
    """
    from app.services.import_service import parse_file_preview
    return parse_file_preview(file_path)



