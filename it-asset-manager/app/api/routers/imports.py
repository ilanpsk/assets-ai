from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_db
from app.core.deps import require_role
from app.schemas.role import RoleName
from app.services import import_service
from app.core.logging import log_activity
from app.core.rate_limit import limiter
from app.models.system_setting import SystemSetting

router = APIRouter()

class ExecuteImportRequest(BaseModel):
    job_id: Optional[UUID] = None
    strategy: str
    options: Dict[str, Any] = {}
    type: str = "asset" # asset or user

@router.get("/config")
@log_activity
async def get_import_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    # Determine Max Size
    max_mb = 50 # Default
    
    # Admin bypass
    if current_user.has_role(RoleName.admin):
        max_mb = None # Unlimited in UI
    else:
        # Check system setting
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == "import_max_upload_mb"))
        setting = res.scalar_one_or_none()
        if setting and setting.value:
            try:
                max_mb = int(setting.value)
            except (ValueError, TypeError):
                pass 
                
    return {
        "allowed_extensions": [".csv", ".xlsx", ".xls", ".json"],
        "max_upload_mb": max_mb
    }

@router.post("/assets")
@limiter.limit("5/minute")
@log_activity
async def import_assets(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    job = await import_service.create_import_job(db, file, current_user)
    return {"job_id": str(job.id)}

@router.post("/{job_id}/analyze")
@log_activity
async def analyze_import(
    job_id: UUID,
    type: str = "asset",
    use_ai: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    # This just returns analysis, doesn't modify job state (except maybe logs)
    # Reuses service logic
    job = await import_service.get_job(db, job_id)
    file_path = job.payload.get("file_path")
    
    if type == "user":
        return await import_service.analyze_user_file(db, file_path)
    else:
        return await import_service.analyze_file(db, file_path, use_ai=use_ai)

@router.post("/{job_id}/execute", status_code=status.HTTP_202_ACCEPTED)
@log_activity
async def execute_import(
    job_id: UUID,
    payload: ExecuteImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    if payload.job_id and payload.job_id != job_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Job ID in path does not match body"
        )

    # Pass job to background execution
    # We need to pass the user_id to the background task
    background_tasks.add_task(
        import_service.execute_import_background_wrapper, 
        job_id, 
        payload.strategy, 
        payload.options, 
        current_user.id,
        payload.type
    )
    return {"status": "accepted", "job_id": str(job_id)}

@router.get("/jobs/{job_id}")
@log_activity
async def get_import_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    return await import_service.get_job(db, job_id)
