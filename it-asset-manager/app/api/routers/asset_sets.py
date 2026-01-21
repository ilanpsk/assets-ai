from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.db import get_db
from app.core.deps import get_current_user, require_permission
from app.schemas.asset_set import AssetSetCreate, AssetSetUpdate, AssetSetRead
from app.services import asset_set_service
from app.core.logging import log_activity
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[AssetSetRead])
@log_activity
async def list_asset_sets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("set:read")),
):
    return await asset_set_service.list_asset_sets(db)

@router.post("/", response_model=AssetSetRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_asset_set(
    data: AssetSetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("set:create")),
):
    return await asset_set_service.create_asset_set(db, data, user_id=current_user.id)

@router.get("/{set_id}", response_model=AssetSetRead)
@log_activity
async def get_asset_set(
    set_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("set:read")),
):
    return await asset_set_service.get_asset_set(db, set_id)

@router.patch("/{set_id}", response_model=AssetSetRead)
@log_activity
async def update_asset_set(
    set_id: UUID,
    data: AssetSetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("set:update")),
):
    return await asset_set_service.update_asset_set(db, set_id, data, user_id=current_user.id)

@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_asset_set(
    set_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("set:delete")),
):
    await asset_set_service.delete_asset_set(db, set_id, user_id=current_user.id)
    return None

