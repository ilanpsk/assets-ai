from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission
from app.schemas.role import RoleRead, RoleCreate, RoleUpdate, RolePermissionsUpdate, PermissionRead
from app.services import role_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/permissions", response_model=List[PermissionRead])
@log_activity
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.list_permissions(db)

@router.get("/", response_model=List[RoleRead])
@log_activity
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.list_roles(db)

@router.get("/{name}", response_model=RoleRead)
@log_activity
async def get_role(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.get_role(db, name)

@router.post("/", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.create_role(db, data, operator_id=current_user.id)

@router.patch("/{name}", response_model=RoleRead)
@log_activity
async def update_role(
    name: str,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.update_role(db, name, data, operator_id=current_user.id)

@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_role(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    await role_service.delete_role(db, name, operator_id=current_user.id)
    return None

@router.put("/{name}/permissions", response_model=RoleRead)
@log_activity
async def update_role_permissions(
    name: str,
    data: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("role:manage"))
):
    return await role_service.assign_permissions(db, name, data.permissions, operator_id=current_user.id)

