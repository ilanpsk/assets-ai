from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission, get_current_user
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.services import user_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/", response_model=List[UserRead])
@log_activity
async def list_users(
    response: Response,
    roles: Optional[List[str]] = Query(None, alias="roles"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("user:read")),
):
    items, total = await user_service.list_users(db, roles=roles, skip=skip, limit=limit, search=search)
    response.headers["X-Total-Count"] = str(total)
    return items

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("user:create")),
):
    return await user_service.create_user(db, payload, operator_id=current_user.id)

@router.get("/me", response_model=UserRead)
@log_activity
async def get_me(
    current_user=Depends(get_current_user),
):
    return current_user

@router.get("/{user_id}", response_model=UserRead)
@log_activity
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("user:read")),
):
    return await user_service.get_user(db, user_id)

@router.patch("/{user_id}", response_model=UserRead)
@log_activity
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("user:update")),
):
    return await user_service.update_user(db, user_id, payload, operator_id=current_user.id)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("user:delete")),
):
    await user_service.delete_user(db, user_id, operator_id=current_user.id)
    return None
