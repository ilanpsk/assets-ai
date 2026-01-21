from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from uuid import UUID
from typing import Dict, Any, List
import logging
import uuid
import asyncio
import tempfile
import os
from app.core.config import settings

from app.models.snapshot import Snapshot
from app.models.asset import Asset
from app.models.user import User
from app.models.request import Request
from app.models.asset_set import AssetSet

logger = logging.getLogger(__name__)

# Tables to include in the snapshot (Order matters for rollback!)
SNAPSHOT_TABLES = [
    "permission", "role", "role_permissions",
    "asset_types", "asset_statuses",
    "user", "user_roles",
    "asset_set", "asset", "request",
    "integration", "job", "custom_field_definition", "system_setting"
]

async def create_snapshot(
    db: AsyncSession, 
    name: str, 
    description: str | None = None, 
    user_id: UUID | None = None
) -> Snapshot:
    """Creates a full database snapshot in a new schema."""
    # Generate unique schema name
    schema_name = f"snapshot_{uuid.uuid4().hex[:12]}"
    
    try:
        # 1. Create separate schema
        # Use execute directly for DDL
        await db.execute(text(f'CREATE SCHEMA "{schema_name}"'))
        
        # 2. Copy all tables into it
        for table in SNAPSHOT_TABLES:
            # Check if table exists first to avoid errors? 
            # Assuming all tables exist as per schema.
            # Using CREATE TABLE AS SELECT * FROM ...
            await db.execute(text(f'CREATE TABLE "{schema_name}"."{table}" AS SELECT * FROM "{table}"'))
            logger.info(f"Snapshotted table: {table} to {schema_name}")
            
        # 3. Calculate metadata
        asset_count = await db.scalar(select(func.count(Asset.id)))
        user_count = await db.scalar(select(func.count(User.id)))
        
        snapshot = Snapshot(
            name=name,
            description=description,
            created_by_id=user_id,
            schema_name=schema_name,
            entity_counts={"assets": asset_count, "users": user_count}
        )
        db.add(snapshot)
        await db.commit()
        logger.info(f"Snapshot created: {name} ({schema_name})")
        return snapshot
        
    except Exception as e:
        await db.rollback()
        # Clean up schema if created
        try:
            await db.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
            await db.commit() 
        except:
            pass
        logger.error(f"Snapshot creation failed: {e}")
        raise e

async def rollback_to_snapshot(db: AsyncSession, snapshot_id: UUID) -> Dict[str, Any]:
    """Reverts the database to the exact state of the snapshot."""
    res = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = res.scalar_one_or_none()
    
    if not snapshot:
        raise ValueError("Snapshot not found")
        
    try:
        # 1. Wipe current data (Reverse order to handle Foreign Keys)
        # Using TRUNCATE CASCADE on top-level tables is often enough if cascade works, 
        # but explicit truncate in reverse order is safer.
        for table in reversed(SNAPSHOT_TABLES):
            # Use CASCADE just in case
            await db.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
            
        # 2. Restore data from snapshot
        for table in SNAPSHOT_TABLES:
            await db.execute(text(f'INSERT INTO "{table}" SELECT * FROM "{snapshot.schema_name}"."{table}"'))
            
        await db.commit()
        logger.info(f"Rolled back to snapshot: {snapshot.name}")
        return {"success": True, "snapshot": snapshot.name}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Rollback failed: {e}")
        raise e

async def list_snapshots(db: AsyncSession) -> List[Snapshot]:
    res = await db.execute(select(Snapshot).order_by(Snapshot.created_at.desc()))
    return res.scalars().all()

async def delete_snapshot(db: AsyncSession, snapshot_id: UUID):
    res = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = res.scalar_one_or_none()
    
    if snapshot:
        await db.execute(text(f'DROP SCHEMA IF EXISTS "{snapshot.schema_name}" CASCADE'))
        await db.delete(snapshot)
        await db.commit()
        logger.info(f"Deleted snapshot: {snapshot.name}")

async def export_snapshot(db: AsyncSession, snapshot_id: UUID) -> str:
    """Exports a snapshot schema to a SQL file using pg_dump."""
    res = await db.execute(select(Snapshot).where(Snapshot.id == snapshot_id))
    snapshot = res.scalar_one_or_none()
    
    if not snapshot:
        raise ValueError("Snapshot not found")
        
    # Create a temporary file
    fd, path = tempfile.mkstemp(suffix=".sql", prefix=f"snapshot_{snapshot.name}_")
    os.close(fd)
    
    # Prepare connection URL
    # Use sync URL for pg_dump
    db_url = settings.SYNC_DATABASE_URL
    
    # pg_dump -n schema_name --no-owner --no-acl -f file_path db_url
    cmd = [
        "pg_dump",
        db_url,
        "-n", snapshot.schema_name,
        "--no-owner",
        "--no-acl",
        "-f", path
    ]
    
    try:
        # Run pg_dump
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"pg_dump failed: {stderr.decode()}")
            raise Exception("Failed to export snapshot")
            
        return path
        
    except Exception as e:
        if os.path.exists(path):
            os.unlink(path)
        raise e

