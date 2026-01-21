from typing import List, Optional, Callable
from uuid import UUID
from pydantic import BaseModel, Field
import logging
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.schemas.asset_type import AssetTypeCreate, AssetTypeUpdate
from app.schemas.asset_status import AssetStatusCreate, AssetStatusUpdate
from app.schemas.custom_field import CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException, PermissionDenied
from app.services import asset_type_service, asset_status_service, custom_field_service

# --- Input Schemas ---

# Asset Types
class ListAssetTypesInput(BaseModel):
    pass

class CreateAssetTypeInput(BaseModel):
    name: str = Field(description="Name of the asset type (e.g. 'Laptop')")

class UpdateAssetTypeInput(BaseModel):
    type_id: UUID = Field(description="UUID of the asset type to update")
    name: Optional[str] = Field(default=None, description="New name")

class DeleteAssetTypeInput(BaseModel):
    type_id: UUID = Field(description="UUID of the asset type to delete")

# Asset Statuses
class ListAssetStatusesInput(BaseModel):
    pass

class CreateAssetStatusInput(BaseModel):
    name: str = Field(description="Name of the status (e.g. 'Retired')")

class UpdateAssetStatusInput(BaseModel):
    key: str = Field(description="Current name/key of the status to update")
    name: Optional[str] = Field(default=None, description="New name")

class DeleteAssetStatusInput(BaseModel):
    key: str = Field(description="Name/key of the status to delete")

# Custom Fields
class ListCustomFieldsInput(BaseModel):
    pass

class CreateCustomFieldInput(BaseModel):
    name: str = Field(description="Name of the field (e.g. 'Warranty Expiration')")
    field_type: str = Field(description="Type: 'string', 'number', 'date', 'boolean', 'select'")
    description: Optional[str] = Field(default=None, description="Description")
    options: Optional[List[str]] = Field(default=None, description="Options if type is 'select'")

class UpdateCustomFieldInput(BaseModel):
    field_id: UUID = Field(description="UUID of the field definition")
    name: Optional[str] = Field(default=None, description="New name")
    description: Optional[str] = Field(default=None, description="New description")
    options: Optional[List[str]] = Field(default=None, description="New options")

class DeleteCustomFieldInput(BaseModel):
    field_id: UUID = Field(description="UUID of the field definition")


def get_config_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    
    logger = logging.getLogger("app.ai.tools.config")

    # --- Asset Types ---

    async def _list_asset_types() -> str:
        async with session_factory() as db:
            try:
                types = await asset_type_service.list_asset_types(db)
                return str([{"id": str(t.id), "name": t.name} for t in types])
            except Exception as e:
                logger.error(f"List asset types failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create_asset_type(name: str) -> str:
        async with session_factory() as db:
            try:
                payload = AssetTypeCreate(name=name)
                obj = await asset_type_service.create_asset_type(db, payload, operator_id=user.id)
                return f"Asset type created. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _update_asset_type(type_id: UUID, name: str = None) -> str:
        async with session_factory() as db:
            try:
                if not name: return "No changes provided."
                payload = AssetTypeUpdate(name=name)
                obj = await asset_type_service.update_asset_type(db, type_id, payload, operator_id=user.id)
                return f"Asset type updated. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _delete_asset_type(type_id: UUID) -> str:
        async with session_factory() as db:
            try:
                await asset_type_service.delete_asset_type(db, type_id, operator_id=user.id)
                return "Asset type deleted."
            except Exception as e:
                return f"Error: {str(e)}"

    # --- Asset Statuses ---

    async def _list_asset_statuses() -> str:
        async with session_factory() as db:
            try:
                statuses = await asset_status_service.list_asset_statuses(db)
                return str([{"id": str(s.id), "name": s.name} for s in statuses])
            except Exception as e:
                logger.error(f"List statuses failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create_asset_status(name: str) -> str:
        async with session_factory() as db:
            try:
                payload = AssetStatusCreate(name=name)
                obj = await asset_status_service.create_asset_status(db, payload, operator_id=user.id)
                return f"Asset status created. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _update_asset_status(key: str, name: str = None) -> str:
        async with session_factory() as db:
            try:
                if not name: return "No changes provided."
                payload = AssetStatusUpdate(name=name)
                # Note: service uses 'key' which is the name for lookup
                obj = await asset_status_service.update_asset_status(db, key, payload, operator_id=user.id)
                return f"Asset status updated. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _delete_asset_status(key: str) -> str:
        async with session_factory() as db:
            try:
                await asset_status_service.delete_asset_status(db, key, operator_id=user.id)
                return "Asset status deleted."
            except Exception as e:
                return f"Error: {str(e)}"

    # --- Custom Fields ---

    async def _list_custom_fields() -> str:
        async with session_factory() as db:
            try:
                fields = await custom_field_service.list_custom_fields(db)
                return str([{
                    "id": str(f.id),
                    "name": f.name,
                    "type": f.field_type,
                    "description": f.description,
                    "options": f.options
                } for f in fields])
            except Exception as e:
                logger.error(f"List custom fields failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create_custom_field(name: str, field_type: str, description: str = None, options: List[str] = None) -> str:
        async with session_factory() as db:
            try:
                # Basic key generation
                key = name.lower().replace(" ", "_")
                
                # Build config
                config = {}
                if description:
                    config["description"] = description
                if options:
                    config["options"] = options
                
                # Default to asset target since tool doesn't expose it yet
                # We also need to map parameters to the schema correctly
                payload = CustomFieldDefinitionCreate(
                    label=name,
                    key=key,
                    target="asset", # Enum value or string that matches
                    field_type=field_type,
                    config=config
                )
                obj = await custom_field_service.create_custom_field(db, payload, operator_id=user.id)
                return f"Custom field created. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _update_custom_field(field_id: UUID, name: str = None, description: str = None, options: List[str] = None) -> str:
        async with session_factory() as db:
            try:
                data = {}
                if name is not None: data["name"] = name
                if description is not None: data["description"] = description
                if options is not None: data["options"] = options
                
                if not data: return "No changes provided."
                
                payload = CustomFieldDefinitionUpdate(**data)
                obj = await custom_field_service.update_custom_field(db, field_id, payload, operator_id=user.id)
                return f"Custom field updated. ID: {obj.id}"
            except Exception as e:
                return f"Error: {str(e)}"

    async def _delete_custom_field(field_id: UUID) -> str:
        async with session_factory() as db:
            try:
                await custom_field_service.delete_custom_field(db, field_id, operator_id=user.id)
                return "Custom field deleted."
            except Exception as e:
                return f"Error: {str(e)}"

    tools = []

    # Config Read Permissions
    if user.has_permission("config:read") or user.has_role("admin"):
        tools.extend([
            StructuredTool.from_function(coroutine=_list_asset_types, name="list_asset_types", description="List available asset types.", args_schema=ListAssetTypesInput),
            StructuredTool.from_function(coroutine=_list_asset_statuses, name="list_asset_statuses", description="List available asset statuses.", args_schema=ListAssetStatusesInput),
            StructuredTool.from_function(coroutine=_list_custom_fields, name="list_custom_fields", description="List custom field definitions.", args_schema=ListCustomFieldsInput),
        ])

    # Config Write Permissions
    if user.has_permission("config:write") or user.has_role("admin"):
        # Types
        tools.extend([
            StructuredTool.from_function(coroutine=_create_asset_type, name="create_asset_type", description="Create a new asset type.", args_schema=CreateAssetTypeInput),
            StructuredTool.from_function(coroutine=_update_asset_type, name="update_asset_type", description="Update an asset type.", args_schema=UpdateAssetTypeInput),
            StructuredTool.from_function(coroutine=_delete_asset_type, name="delete_asset_type", description="Delete an asset type.", args_schema=DeleteAssetTypeInput),
        ])
        # Statuses
        tools.extend([
            StructuredTool.from_function(coroutine=_create_asset_status, name="create_asset_status", description="Create a new asset status.", args_schema=CreateAssetStatusInput),
            StructuredTool.from_function(coroutine=_update_asset_status, name="update_asset_status", description="Update an asset status.", args_schema=UpdateAssetStatusInput),
            StructuredTool.from_function(coroutine=_delete_asset_status, name="delete_asset_status", description="Delete an asset status.", args_schema=DeleteAssetStatusInput),
        ])
        # Fields
        tools.extend([
            StructuredTool.from_function(coroutine=_create_custom_field, name="create_custom_field", description="Create a new custom field definition.", args_schema=CreateCustomFieldInput),
            StructuredTool.from_function(coroutine=_update_custom_field, name="update_custom_field", description="Update a custom field definition.", args_schema=UpdateCustomFieldInput),
            StructuredTool.from_function(coroutine=_delete_custom_field, name="delete_custom_field", description="Delete a custom field definition.", args_schema=DeleteCustomFieldInput),
        ])

    return tools

