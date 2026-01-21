from typing import List, Optional, Dict, Any, Callable
from uuid import UUID
from pydantic import BaseModel, Field
import logging

from langchain_core.tools import StructuredTool

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.exceptions import (
    ResourceNotFound,
    DuplicateResource,
    ValidationException,
    PermissionDenied,
)
from app.services import import_service

class AnalyzeUserImportInput(BaseModel):
    file_path: Optional[str] = Field(default=None, description="Server-side file path to analyze")
    job_id: Optional[UUID] = Field(default=None, description="Job ID if the file was uploaded via API")

class ExecuteUserImportInput(BaseModel):
    job_id: UUID = Field(description="Job ID of the import")
    strategy: str = Field(description="Strategy: 'NEW_SET', 'EXISTING_SET', or 'GLOBAL'")
    options: dict = Field(default={}, description="Options including new_set_name, asset_set_id")

def get_import_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    
    logger = logging.getLogger("app.ai.tools.import")

    async def _analyze_user_import(file_path: str = None, job_id: UUID = None) -> str:
        async with session_factory() as db:
            try:
                if job_id:
                    job = await import_service.get_job(db, job_id)
                    file_path = job.payload["file_path"]
                
                if not file_path:
                    return "Error: Either file_path or job_id must be provided."

                result = await import_service.analyze_user_file(db, file_path)
                return str(result)
            except ResourceNotFound as e:
                 return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except Exception as e:
                logger.error(f"Analysis failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _execute_user_import(job_id: UUID, strategy: str, options: dict = {}) -> str:
        async with session_factory() as db:
            try:
                result = await import_service.execute_user_import(db, job_id, strategy, options, user_id=user.id)
                return str(result)
            except ResourceNotFound as e:
                 return f"Error: {str(e)}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Import execution failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools = []

    # Check permissions - Assuming admin or specific permission for user import
    if user.has_role("admin") or user.has_permission("user:create"):
        tools.extend([
            StructuredTool.from_function(
                coroutine=_analyze_user_import,
                name="analyze_user_import_file",
                description="Analyze a file before importing users to determine schema.",
                args_schema=AnalyzeUserImportInput,
            ),
            StructuredTool.from_function(
                coroutine=_execute_user_import,
                name="execute_user_import",
                description="Execute a user import using a chosen strategy (NEW_SET/EXISTING_SET/GLOBAL).",
                args_schema=ExecuteUserImportInput,
            )
        ])

    return tools

