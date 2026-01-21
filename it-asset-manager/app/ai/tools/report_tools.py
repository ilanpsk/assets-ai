from typing import List, Optional, Dict, Any, Callable
import logging
import tempfile

from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.role import RoleName
from app.services import report_service
from app.core.exceptions import PermissionDenied


class ReportStatsInput(BaseModel):
    pass


class ReportExportInput(BaseModel):
    entity_type: str = Field(description="Entity to export: 'asset', 'user', or 'log'")
    fields: List[str] = Field(description="Fields/columns to include in the export")
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional filters (e.g. start_date for logs)",
    )


def get_report_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    """
    Tools for report stats and CSV exports. Restricted to IT/admin roles.
    """
    logger = logging.getLogger("app.ai.tools.report")

    def _ensure_it_access():
        if not (user.has_role(RoleName.admin) or user.has_role(RoleName.it)):
            raise PermissionDenied("Not authorized to access reports.")

    async def _get_stats() -> str:
        async with session_factory() as db:
            try:
                _ensure_it_access()
                stats = await report_service.get_log_statistics(db)
                return str(stats)
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Get report stats failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _export(entity_type: str, fields: List[str], filters: Dict[str, Any] = None) -> str:
        async with session_factory() as db:
            try:
                _ensure_it_access()
                csv_content = await report_service.generate_csv_export(
                    db, entity_type, fields, filters
                )
                # Write to temporary file so the caller can download/use it.
                with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
                    f.write(csv_content)
                    temp_path = f.name
                return f"CSV export ready at: {temp_path}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Export report failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools: List[StructuredTool] = []

    if user.has_role(RoleName.admin) or user.has_role(RoleName.it):
        tools.extend(
            [
                StructuredTool.from_function(
                    coroutine=_get_stats,
                    name="get_report_stats",
                    description="Get report statistics (activity volume and action distribution).",
                    args_schema=ReportStatsInput,
                ),
                StructuredTool.from_function(
                    coroutine=_export,
                    name="export_report_csv",
                    description="Export CSV data for assets, users, or logs. Returns a temp file path.",
                    args_schema=ReportExportInput,
                ),
            ]
        )

    return tools




