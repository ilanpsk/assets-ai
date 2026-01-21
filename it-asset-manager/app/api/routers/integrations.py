from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission
from app.schemas.integration import IntegrationRead, IntegrationCreate, IntegrationUpdate
from app.services import integration_service
from app.core.logging import log_activity

router = APIRouter()

@router.post("/{integration_id}/sync")
@log_activity
async def sync_integration(
    integration_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    # This creates the job and returns ID, then schedules async execution
    job_id = await integration_service.create_sync_job(db, integration_id)
    background_tasks.add_task(integration_service.run_sync, integration_id, job_id)
    return {"job_id": str(job_id)}

@router.get("/", response_model=List[IntegrationRead])
@log_activity
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await integration_service.list_integrations(db)

@router.post("/", response_model=IntegrationRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_integration(
    payload: IntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await integration_service.create_integration(db, payload, operator_id=current_user.id)

@router.get("/{integration_id}", response_model=IntegrationRead)
@log_activity
async def get_integration(
    integration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await integration_service.get_integration(db, integration_id)

@router.patch("/{integration_id}", response_model=IntegrationRead)
@log_activity
async def update_integration(
    integration_id: UUID,
    payload: IntegrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await integration_service.update_integration(db, integration_id, payload, operator_id=current_user.id)

@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_integration(
    integration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    await integration_service.delete_integration(db, integration_id, operator_id=current_user.id)
    return None
