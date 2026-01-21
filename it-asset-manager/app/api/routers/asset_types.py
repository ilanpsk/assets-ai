from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission
from app.schemas.asset_type import AssetTypeRead, AssetTypeCreate, AssetTypeUpdate
from app.services import asset_type_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/", response_model=List[AssetTypeRead])
@log_activity
async def list_asset_types(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await asset_type_service.list_asset_types(db)

@router.post("/", response_model=AssetTypeRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_asset_type(
    payload: AssetTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await asset_type_service.create_asset_type(db, payload, operator_id=current_user.id)

@router.get("/{type_id}", response_model=AssetTypeRead)
@log_activity
async def get_asset_type(
    type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await asset_type_service.get_asset_type(db, type_id)

@router.patch("/{type_id}", response_model=AssetTypeRead)
@log_activity
async def update_asset_type(
    type_id: UUID,
    payload: AssetTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await asset_type_service.update_asset_type(db, type_id, payload, operator_id=current_user.id)

@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_asset_type(
    type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    await asset_type_service.delete_asset_type(db, type_id, operator_id=current_user.id)
    return None
