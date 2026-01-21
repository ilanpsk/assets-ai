from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_role
from app.schemas.asset import AssetRead
from app.schemas.search import GlobalSearchResult
from app.schemas.role import RoleName
from app.services import search_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/assets", response_model=List[AssetRead])
@log_activity
async def search_assets(
    q: str = Query("", alias="q"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    return await search_service.search_assets(db, query=q)

@router.get("/global", response_model=GlobalSearchResult)
@log_activity
async def search_global(
    q: str = Query("", alias="q"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    return await search_service.search_global(db, query=q)
