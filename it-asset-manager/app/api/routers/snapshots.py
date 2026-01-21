from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os

from app.core.db import get_db
from app.core.deps import require_role
from app.schemas.role import RoleName
from app.services import snapshot_service
from app.core.logging import log_activity

router = APIRouter()

class SnapshotCreate(BaseModel):
    name: str
    description: Optional[str] = None

class SnapshotRead(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    entity_counts: dict
    schema_name: str
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/", response_model=SnapshotRead)
@log_activity
async def create_snapshot(
    data: SnapshotCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(RoleName.admin))
):
    """Admin: Take a new snapshot"""
    return await snapshot_service.create_snapshot(db, data.name, data.description, user.id)

@router.get("/", response_model=List[SnapshotRead])
@log_activity
async def list_snapshots(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(RoleName.admin))
):
    """Admin: List all snapshots"""
    return await snapshot_service.list_snapshots(db)

@router.post("/{snapshot_id}/rollback")
@log_activity
async def rollback(
    snapshot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(RoleName.admin))
):
    """Admin: Revert system to this snapshot"""
    return await snapshot_service.rollback_to_snapshot(db, snapshot_id)

@router.get("/{snapshot_id}/export")
@log_activity
async def export_snapshot(
    snapshot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(RoleName.admin))
):
    """Admin: Export snapshot to SQL file"""
    file_path = await snapshot_service.export_snapshot(db, snapshot_id)
    
    return FileResponse(
        path=file_path,
        filename=f"snapshot_{snapshot_id}.sql",
        media_type="application/sql",
        background=BackgroundTask(os.remove, file_path)
    )

@router.delete("/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_snapshot(
    snapshot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(RoleName.admin))
):
    """Admin: Delete a snapshot"""
    await snapshot_service.delete_snapshot(db, snapshot_id)

