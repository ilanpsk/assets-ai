from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.integration import Integration
from app.models.audit_log import AuditLog
from app.schemas.integration import IntegrationCreate, IntegrationUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound
from app.models.job import Job, JobType, JobStatus
import asyncio
import logging

logger = logging.getLogger(__name__)

@log_activity
async def create_sync_job(db: AsyncSession, integration_id: UUID) -> UUID:
    # Verify integration exists
    await get_integration(db, integration_id)
    
    job = Job(
        type=JobType.sync_integration,
        status=JobStatus.pending,
        payload={"integration_id": str(integration_id)}
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job.id

async def run_sync(integration_id: UUID, job_id: UUID):
    from app.core.db import async_session_factory
    from sqlalchemy import select
    
    async with async_session_factory() as db:
        try:
            # 1. Update status to running
            res = await db.execute(select(Job).where(Job.id == job_id))
            job = res.scalar_one_or_none()
            if job:
                job.status = JobStatus.running
                await db.commit()
            
            # 2. Simulate Sync Logic (Stub)
            # In a real impl, this would fetch config, connect to external API, etc.
            await asyncio.sleep(2) 
            logger.info(f"Syncing integration {integration_id}...")
            
            # 3. Update to completed
            res = await db.execute(select(Job).where(Job.id == job_id))
            job = res.scalar_one_or_none()
            if job:
                job.status = JobStatus.completed
                job.result = {"message": "Sync completed successfully (stub)."}
                await db.commit()
                
        except Exception as e:
            logger.error(f"Sync failed: {str(e)}", exc_info=True)
            try:
                res = await db.execute(select(Job).where(Job.id == job_id))
                job = res.scalar_one_or_none()
                if job:
                    job.status = JobStatus.failed
                    job.error = str(e)
                    await db.commit()
            except:
                pass

@log_activity
async def list_integrations(db: AsyncSession) -> List[Integration]:
    res = await db.execute(select(Integration))
    return res.scalars().all()

@log_activity
async def get_integration(db: AsyncSession, integration_id: UUID) -> Integration:
    res = await db.execute(select(Integration).where(Integration.id == integration_id))
    obj = res.scalar_one_or_none()
    if not obj:
        raise ResourceNotFound(f"Integration with id {integration_id} not found")
    return obj

@log_activity
async def create_integration(db: AsyncSession, data: IntegrationCreate, operator_id: UUID | None = None) -> Integration:
    obj = Integration(**data.model_dump())
    db.add(obj)
    await db.flush()
    
    # Audit Log
    log = AuditLog(
        entity_type="integration",
        entity_id=str(obj.id),
        action="create",
        changes=data.model_dump(mode="json"),
        user_id=operator_id,
    )
    db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def update_integration(db: AsyncSession, integration_id: UUID, data: IntegrationUpdate, operator_id: UUID | None = None) -> Integration:
    obj = await get_integration(db, integration_id)
    # get_integration raises ResourceNotFound
    
    changes = data.model_dump(exclude_unset=True, mode="json")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    
    if changes:
        log = AuditLog(
            entity_type="integration",
            entity_id=str(obj.id),
            action="update",
            changes=changes,
            user_id=operator_id,
        )
        db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def delete_integration(db: AsyncSession, integration_id: UUID, operator_id: UUID | None = None) -> bool:
    obj = await get_integration(db, integration_id)
    # get_integration raises ResourceNotFound
    
    # Audit Log
    log = AuditLog(
        entity_type="integration",
        entity_id=str(obj.id),
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.delete(obj)
    await db.commit()
    return True
