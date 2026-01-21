from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission
from app.schemas.custom_field import CustomFieldDefinitionRead, CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate
from app.services import custom_field_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/", response_model=List[CustomFieldDefinitionRead])
@log_activity
async def list_custom_fields(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await custom_field_service.list_custom_fields(db)

@router.post("/", response_model=CustomFieldDefinitionRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_custom_field(
    payload: CustomFieldDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await custom_field_service.create_custom_field(db, payload, operator_id=current_user.id)

@router.patch("/{field_id}", response_model=CustomFieldDefinitionRead)
@log_activity
async def update_custom_field(
    field_id: UUID,
    payload: CustomFieldDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await custom_field_service.update_custom_field(db, field_id, payload, operator_id=current_user.id)

@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_custom_field(
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    await custom_field_service.delete_custom_field(db, field_id, operator_id=current_user.id)
    return None
