from typing import List, Optional, Type, Any, Callable
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from langchain_core.tools import StructuredTool

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.asset import AssetCreate, AssetUpdate
from app.schemas.asset_set import AssetSetCreate, AssetSetUpdate
from app.models.asset_set import AssetSet
from app.models.user import User
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.core.exceptions import (
    ResourceNotFound,
    DuplicateResource,
    ValidationException,
    PermissionDenied,
    AuthenticationError,
)
from app.services import import_service, asset_set_service, asset_service, search_service, dashboard_service, user_service

# Tool Input Schemas

class SearchAssetsInput(BaseModel):
    query: str = Field(description="The search query (name, serial number, location, user name, email, etc.)")

class ListAssetsInput(BaseModel):
    status: Optional[str] = Field(default=None, description="Filter by status name (e.g. 'active', 'in_stock', 'fix', 'retired', 'lost')")
    asset_type: Optional[str] = Field(default=None, description="Filter by asset type name (e.g. 'Laptop', 'Server')")
    assigned_user_email: Optional[str] = Field(default=None, description="Filter by assigned user email")
    created_after: Optional[datetime] = Field(default=None, description="Filter assets created after this date")
    created_before: Optional[datetime] = Field(default=None, description="Filter assets created before this date")
    limit: int = Field(default=50, description="Max number of results")

class CreateAssetInput(BaseModel):
    name: str = Field(description="Name of the asset")
    status: str = Field(default="active", description="Status of the asset (active, in_stock, fix, retired, lost)")
    serial_number: Optional[str] = Field(default=None, description="Serial number of the asset")
    location: Optional[str] = Field(default=None, description="Physical location")
    asset_type_id: Optional[UUID] = Field(default=None, description="UUID of the asset type")
    asset_set_id: Optional[UUID] = Field(default=None, description="UUID of the asset set to belong to")
    assigned_user_id: Optional[UUID] = Field(default=None, description="UUID of the user assigned to")
    extra: Optional[dict] = Field(default={}, description="Additional dynamic fields (key-value pairs)")

class UpdateAssetInput(BaseModel):
    asset_id: UUID = Field(description="The UUID of the asset to update")
    name: Optional[str] = Field(default=None, description="New name")
    status: Optional[str] = Field(default=None, description="New status (active, in_stock, fix, retired, lost)")
    serial_number: Optional[str] = Field(default=None, description="New serial number")
    location: Optional[str] = Field(default=None, description="New location")
    asset_set_id: Optional[UUID] = Field(default=None, description="New asset set ID")
    assigned_user_id: Optional[UUID] = Field(default=None, description="New assigned user UUID")
    unassign_user: bool = Field(default=False, description="Set to True to remove the current user assignment")
    extra: Optional[dict] = Field(default=None, description="New dynamic fields to merge")

class DeleteAssetInput(BaseModel):
    asset_id: UUID = Field(description="The UUID of the asset to delete")

class BulkDeleteAssetsInput(BaseModel):
    asset_ids: Optional[List[UUID]] = Field(default=None, description="List of UUIDs of assets to delete")
    asset_set_id: Optional[str] = Field(default=None, description="UUID of the asset set (or name/partial ID) to delete all assets from")

class GetAssetInput(BaseModel):
    asset_id: UUID = Field(description="The UUID of the asset to retrieve")

class ImportAssetsInput(BaseModel):
    assets: List[dict] = Field(description="List of asset dictionaries to create. Each should have at least 'name'.")

class AnalyzeImportInput(BaseModel):
    file_path: Optional[str] = Field(default=None, description="Server-side file path to analyze")
    job_id: Optional[UUID] = Field(default=None, description="Job ID if the file was uploaded via API")

class ExecuteImportInput(BaseModel):
    job_id: UUID = Field(description="Job ID of the import")
    strategy: str = Field(description="Strategy: 'MERGE', 'NEW_SET', or 'EXISTING_SET'")
    new_set_name: Optional[str] = Field(default=None, description="Name for the new asset set (Required if strategy='NEW_SET')")
    asset_set_id: Optional[UUID] = Field(default=None, description="UUID of existing asset set (Required if strategy='EXISTING_SET')")
    options: dict = Field(default={}, description="Additional options: mapping (dict of 'CSV Header': 'system_field'), new_fields, user_map")

class ListAssetSetsInput(BaseModel):
    pass

class CreateAssetSetInput(BaseModel):
    name: str = Field(description="Name of the asset set")
    description: Optional[str] = Field(default=None, description="Description of the asset set")

class UpdateAssetSetInput(BaseModel):
    set_id: UUID = Field(description="UUID of the asset set to update")
    name: Optional[str] = Field(default=None, description="New name")
    description: Optional[str] = Field(default=None, description="New description")

class DeleteAssetSetInput(BaseModel):
    set_id: UUID = Field(description="UUID of the asset set to delete")

class GetDashboardStatsInput(BaseModel):
    pass

def get_asset_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    
    logger = logging.getLogger("app.ai.tools")

    async def _search(query: str) -> str:
        async with session_factory() as db:
            try:
                # Use global search which searches assets, users, logs.
                # But here we focus on assets result + user ownership context
                res = await search_service.search_global(db, query)
                assets = res.get("assets", [])
                
                if not assets:
                    return "No assets found matching that query."
                
                output = []
                for a in assets:
                    owner_info = "None"
                    if a.assigned_user:
                         owner_info = f"{a.assigned_user.email} ({a.assigned_user.full_name})"
                    
                    output.append({
                        "id": str(a.id),
                        "name": a.name,
                        "serial": a.serial_number,
                        "status": a.status.name if a.status else "Unknown",
                        "location": a.location,
                        "assigned_to": owner_info
                    })
                return str(output)
            except Exception as e:
                logger.error(f"Search failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _list_assets(status: str = None, asset_type: str = None, assigned_user_email: str = None, created_after: datetime = None, created_before: datetime = None, limit: int = 50) -> str:
        async with session_factory() as db:
            try:
                # Resolve filters to IDs
                status_id = None
                if status:
                    res = await db.execute(select(AssetStatus).where(AssetStatus.name == status))
                    s = res.scalar_one_or_none()
                    if s: status_id = s.id
                
                asset_type_id = None
                if asset_type:
                     res = await db.execute(select(AssetType).where(AssetType.name == asset_type))
                     t = res.scalar_one_or_none()
                     if t: asset_type_id = t.id
                
                assigned_user_id = None
                if assigned_user_email:
                    u = await user_service.get_user_by_email(db, assigned_user_email)
                    if u: assigned_user_id = u.id
                
                result = await asset_service.list_assets(
                    db, 
                    size=limit, 
                    status_id=status_id, 
                    asset_type_id=asset_type_id, 
                    assigned_user_id=assigned_user_id,
                    created_after=created_after,
                    created_before=created_before
                )
                
                items = result["items"]
                if not items:
                    return "No assets found."
                
                output = []
                for a in items:
                    output.append({
                        "id": str(a.id),
                        "name": a.name,
                        "status": a.status.name if a.status else None,
                        "type": a.asset_type.name if a.asset_type else None,
                        "assigned_to": a.assigned_user.email if a.assigned_user else None,
                        "created_at": str(a.created_at)
                    })
                
                return f"Found {result['total']} assets (showing top {len(items)}): {str(output)}"

            except Exception as e:
                logger.error(f"List assets failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create(name: str, status: str = "active", serial_number: str = None, location: str = None, asset_type_id: UUID = None, asset_set_id: UUID = None, assigned_user_id: UUID = None, extra: dict = {}) -> str:
        async with session_factory() as db:
            try:
                payload = AssetCreate(
                    name=name,
                    status=status,
                    serial_number=serial_number,
                    location=location,
                    asset_type_id=asset_type_id,
                    asset_set_id=asset_set_id,
                    assigned_user_id=assigned_user_id,
                    extra=extra
                )
                asset = await asset_service.create_asset(db, payload, user_id=user.id)
                return f"Asset created successfully. ID: {asset.id}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Create asset failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _update(asset_id: UUID, name: str = None, status: str = None, serial_number: str = None, location: str = None, asset_set_id: UUID = None, assigned_user_id: UUID = None, unassign_user: bool = False, extra: dict = None) -> str:
        async with session_factory() as db:
            try:
                # Construct update payload
                data = {}
                if name is not None: data["name"] = name
                if status is not None: data["status"] = status
                if serial_number is not None: data["serial_number"] = serial_number
                if location is not None: data["location"] = location
                if asset_set_id is not None: data["asset_set_id"] = asset_set_id
                
                if unassign_user:
                    data["assigned_user_id"] = None
                elif assigned_user_id is not None:
                    data["assigned_user_id"] = assigned_user_id
                    
                if extra is not None: data["extra"] = extra
                
                if not data:
                    return "No changes provided."
                
                payload = AssetUpdate(**data)
                asset = await asset_service.update_asset(db, asset_id, payload, user_id=user.id)
                if not asset:
                    return "Asset not found."
                return f"Asset updated successfully. ID: {asset.id}"
            except ResourceNotFound as e:
                return f"Error: {str(e)}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Update asset failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _delete(asset_id: UUID) -> str:
        async with session_factory() as db:
            try:
                await asset_service.delete_asset(db, asset_id, user_id=user.id)
                return "Asset deleted successfully."
            except ResourceNotFound:
                return "Asset not found."
            except Exception as e:
                logger.error(f"Delete asset failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _bulk_delete(asset_ids: List[UUID] = None, asset_set_id: str = None) -> str:
        async with session_factory() as db:
            try:
                final_set_id = None
                if asset_set_id:
                     # Check if it's a UUID
                     try:
                         final_set_id = UUID(asset_set_id)
                     except ValueError:
                         # Treat as name
                         # Try exact match first
                         res = await db.execute(select(AssetSet).where(AssetSet.name == asset_set_id))
                         asset_set = res.scalar_one_or_none()
                         
                         if not asset_set:
                             # Try ilike for better UX
                             res = await db.execute(select(AssetSet).where(AssetSet.name.ilike(f"%{asset_set_id}%")))
                             asset_set = res.scalar_one_or_none()
                         
                         if not asset_set:
                             return f"Asset set with ID or name matching '{asset_set_id}' not found."
                         final_set_id = asset_set.id

                count = await asset_service.bulk_delete_assets(db, asset_ids=asset_ids, asset_set_id=final_set_id, user_id=user.id)
                return f"Successfully deleted {count} assets."
            except Exception as e:
                logger.error(f"Bulk delete assets failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _get(asset_id: UUID) -> str:
        async with session_factory() as db:
            try:
                asset = await asset_service.get_asset(db, asset_id)
                if not asset:
                    return "Asset not found."
                
                # Resolve Owner
                owner_details = None
                if asset.assigned_user_id:
                    try:
                        u = await user_service.get_user(db, asset.assigned_user_id)
                        owner_details = {"email": u.email, "name": u.full_name, "id": str(u.id)}
                    except ResourceNotFound:
                        owner_details = "User not found"

                # Dump full details
                return str({
                    "id": str(asset.id),
                    "name": asset.name,
                    "serial": asset.serial_number,
                    "status": asset.status.name if asset.status else asset.status_id,
                    "location": asset.location,
                    "asset_set_id": str(asset.asset_set_id) if asset.asset_set_id else None,
                    "assigned_to": owner_details,
                    "extra": asset.extra,
                    "created_at": str(asset.created_at)
                })
            except ResourceNotFound as e:
                return f"Error: {str(e)}"
            except Exception as e:
                logger.error(f"Get asset failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _import(assets: List[dict]) -> str:
        async with session_factory() as db:
            try:
                result = await asset_service.bulk_create_assets(db, assets, user_id=user.id)
                return f"Import result: Created {result['created']}, Errors: {len(result['errors'])}. Details: {result['errors']}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Import assets failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _analyze_import(file_path: str = None, job_id: UUID = None) -> str:
        async with session_factory() as db:
            try:
                if job_id:
                    job = await import_service.get_job(db, job_id)
                    file_path = job.payload["file_path"]
                
                if not file_path:
                    return "Error: Either file_path or job_id must be provided."

                result = await import_service.analyze_file(db, file_path)
                return str(result)
            except ResourceNotFound as e:
                 return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except Exception as e:
                logger.error(f"Analysis failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _execute_import(job_id: UUID, strategy: str, new_set_name: str = None, asset_set_id: UUID = None, options: dict = {}) -> str:
        async with session_factory() as db:
            try:
                # Merge explicit args into options
                if new_set_name:
                    options["new_set_name"] = new_set_name
                if asset_set_id:
                    options["asset_set_id"] = str(asset_set_id)

                result = await import_service.execute_import(db, job_id, strategy, options, user_id=user.id)
                return str(result)
            except ResourceNotFound as e:
                 return f"Error: {str(e)}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Import execution failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _list_asset_sets() -> str:
        async with session_factory() as db:
            try:
                sets = await asset_set_service.list_asset_sets(db)
                if not sets:
                    return "No asset sets found."
                return str([{"id": str(s.id), "name": s.name, "description": s.description} for s in sets])
            except Exception as e:
                logger.error(f"List asset sets failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create_asset_set(name: str, description: str = None) -> str:
        async with session_factory() as db:
            try:
                payload = AssetSetCreate(name=name, description=description)
                asset_set = await asset_set_service.create_asset_set(db, payload, user_id=user.id)
                return f"Asset set created successfully. ID: {asset_set.id}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Create asset set failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _update_asset_set(set_id: UUID, name: str = None, description: str = None) -> str:
        async with session_factory() as db:
            try:
                data = {}
                if name is not None: data["name"] = name
                if description is not None: data["description"] = description
                
                if not data:
                    return "No changes provided."
                
                payload = AssetSetUpdate(**data)
                updated_set = await asset_set_service.update_asset_set(db, set_id, payload, user_id=user.id)
                return f"Asset set updated successfully. ID: {updated_set.id}"
            except ResourceNotFound:
                return "Asset set not found."
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except Exception as e:
                 logger.error(f"Update asset set failed: {str(e)}", exc_info=True)
                 return f"System Error: {str(e)}"

    async def _delete_asset_set(set_id: UUID) -> str:
        async with session_factory() as db:
            try:
                await asset_set_service.delete_asset_set(db, set_id, user_id=user.id)
                return "Asset set deleted successfully."
            except ResourceNotFound:
                return "Asset set not found."
            except Exception as e:
                logger.error(f"Delete asset set failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _get_stats() -> str:
        async with session_factory() as db:
            try:
                stats = await dashboard_service.get_stats(db)
                return str(stats)
            except Exception as e:
                logger.error(f"Get stats failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools = []

    # Conditionally add tools based on permissions
    if user.has_permission("asset:read"):
        tools.extend([
            StructuredTool.from_function(
                coroutine=_search,
                name="search_assets",
                description="Search for assets by name, serial number, location, or owner. Searches broadly.",
                args_schema=SearchAssetsInput,
            ),
            StructuredTool.from_function(
                coroutine=_list_assets,
                name="list_assets",
                description="List and filter assets by status, type, assigned user, or creation date. Useful for counting specific subsets (e.g. 'how many laptops').",
                args_schema=ListAssetsInput,
            ),
            StructuredTool.from_function(
                coroutine=_get,
                name="get_asset_details",
                description="Get full details of a specific asset by ID.",
                args_schema=GetAssetInput,
            ),
            StructuredTool.from_function(
                coroutine=_get_stats,
                name="get_dashboard_stats",
                description="Get overall statistics about assets, including total count and breakdown by status/type.",
                args_schema=GetDashboardStatsInput,
            )
        ])

    if user.has_permission("asset:create"):
        tools.extend([
            StructuredTool.from_function(
                coroutine=_create,
                name="create_asset",
                description="Create a new IT asset.",
                args_schema=CreateAssetInput,
            ),
            StructuredTool.from_function(
                coroutine=_import,
                name="import_assets",
                description="Bulk create assets. Use this to import multiple assets at once.",
                args_schema=ImportAssetsInput,
            ),
            StructuredTool.from_function(
                coroutine=_analyze_import,
                name="analyze_import_file",
                description="Analyze a file before importing to determine schema and user mapping.",
                args_schema=AnalyzeImportInput,
            ),
            StructuredTool.from_function(
                coroutine=_execute_import,
                name="execute_smart_import",
                description="Execute a smart import using a chosen strategy (MERGE/NEW_SET/EXISTING_SET).",
                args_schema=ExecuteImportInput,
            )
        ])

    if user.has_permission("asset:update"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_update,
                name="update_asset",
                description="Update an existing asset's details.",
                args_schema=UpdateAssetInput,
            )
        )
    
    if user.has_permission("asset:delete") or user.has_role("admin"):
        tools.extend([
            StructuredTool.from_function(
                coroutine=_delete,
                name="delete_asset",
                description="Permanently delete an asset.",
                args_schema=DeleteAssetInput,
            ),
            StructuredTool.from_function(
                coroutine=_bulk_delete,
                name="bulk_delete_assets",
                description="Bulk delete assets by providing a list of IDs OR an asset set ID/Name.",
                args_schema=BulkDeleteAssetsInput,
            )
        ])

    if user.has_permission("set:read"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_list_asset_sets,
                name="list_asset_sets",
                description="List all available asset sets (groups of assets with custom schemas).",
                args_schema=ListAssetSetsInput,
            )
        )

    if user.has_permission("set:create") or user.has_role("admin"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_create_asset_set,
                name="create_asset_set",
                description="Create a new asset set.",
                args_schema=CreateAssetSetInput,
            )
        )

    if user.has_permission("set:update") or user.has_role("admin"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_update_asset_set,
                name="update_asset_set",
                description="Update an existing asset set.",
                args_schema=UpdateAssetSetInput,
            )
        )

    if user.has_permission("set:delete") or user.has_role("admin"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_delete_asset_set,
                name="delete_asset_set",
                description="Delete an asset set.",
                args_schema=DeleteAssetSetInput,
            )
        )

    return tools
