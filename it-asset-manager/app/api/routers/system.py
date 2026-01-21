from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.logging import log_activity
from app.schemas.system import SystemStatus, SetupRequest
from app.services import system_service

router = APIRouter()

@router.get("/status", response_model=SystemStatus)
@log_activity
async def get_system_status(db: AsyncSession = Depends(get_db)):
    initialized = await system_service.get_system_initialization_status(db)
    return SystemStatus(initialized=initialized)

@router.post("/setup", status_code=status.HTTP_201_CREATED)
@log_activity
async def setup_system(
    payload: SetupRequest,
    db: AsyncSession = Depends(get_db)
):
    return await system_service.setup_system(db, payload)
