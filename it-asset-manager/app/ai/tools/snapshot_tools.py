from typing import List, Callable
from uuid import UUID
import logging

from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.role import RoleName
from app.services import snapshot_service
from app.core.exceptions import PermissionDenied


class SnapshotCreateInput(BaseModel):
    name: str = Field(description="Name of the snapshot")
    description: str | None = Field(default=None, description="Optional description")


class ListSnapshotsInput(BaseModel):
    pass


class SnapshotIdInput(BaseModel):
    snapshot_id: UUID = Field(description="ID of the snapshot")


def get_snapshot_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    """
    Tools for snapshot lifecycle (admin only).
    """
    logger = logging.getLogger("app.ai.tools.snapshot")

    def _ensure_admin():
        if not user.has_role(RoleName.admin):
            raise PermissionDenied("Admin access required for snapshots.")

    async def _create_snapshot(name: str, description: str = None) -> str:
        async with session_factory() as db:
            try:
                _ensure_admin()
                snap = await snapshot_service.create_snapshot(db, name, description, user_id=user.id)
                return f"Snapshot created. ID: {snap.id} (schema={snap.schema_name})"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Create snapshot failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _list_snapshots() -> str:
        async with session_factory() as db:
            try:
                _ensure_admin()
                snaps = await snapshot_service.list_snapshots(db)
                if not snaps:
                    return "No snapshots found."
                return str(
                    [
                        {
                            "id": str(s.id),
                            "name": s.name,
                            "description": s.description,
                            "created_at": str(s.created_at),
                            "schema": s.schema_name,
                            "counts": s.entity_counts,
                        }
                        for s in snaps
                    ]
                )
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"List snapshots failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _rollback(snapshot_id: UUID) -> str:
        async with session_factory() as db:
            try:
                _ensure_admin()
                result = await snapshot_service.rollback_to_snapshot(db, snapshot_id)
                return str(result)
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Rollback snapshot failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _export(snapshot_id: UUID) -> str:
        async with session_factory() as db:
            try:
                _ensure_admin()
                path = await snapshot_service.export_snapshot(db, snapshot_id)
                return f"Snapshot export ready at: {path}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Export snapshot failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _delete(snapshot_id: UUID) -> str:
        async with session_factory() as db:
            try:
                _ensure_admin()
                await snapshot_service.delete_snapshot(db, snapshot_id)
                return "Snapshot deleted."
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Delete snapshot failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools: List[StructuredTool] = []

    if user.has_role(RoleName.admin):
        tools.extend(
            [
                StructuredTool.from_function(
                    coroutine=_create_snapshot,
                    name="create_snapshot",
                    description="Create a new database snapshot (admin only).",
                    args_schema=SnapshotCreateInput,
                ),
                StructuredTool.from_function(
                    coroutine=_list_snapshots,
                    name="list_snapshots",
                    description="List all snapshots.",
                    args_schema=ListSnapshotsInput,
                ),
                StructuredTool.from_function(
                    coroutine=_rollback,
                    name="rollback_snapshot",
                    description="Rollback the system to a specific snapshot.",
                    args_schema=SnapshotIdInput,
                ),
                StructuredTool.from_function(
                    coroutine=_export,
                    name="export_snapshot",
                    description="Export a snapshot to a SQL file; returns a file path.",
                    args_schema=SnapshotIdInput,
                ),
                StructuredTool.from_function(
                    coroutine=_delete,
                    name="delete_snapshot",
                    description="Delete a snapshot.",
                    args_schema=SnapshotIdInput,
                ),
            ]
        )

    return tools




