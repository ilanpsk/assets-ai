from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr
import logging
import json
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Callable

from app.schemas.user import UserCreate, UserUpdate
from app.models.user import User
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException, PermissionDenied
from app.services import user_service
from app.ai.tools.tool_utils import unpack_items_total, extract_first_matching

# Input Schemas
class ListUsersInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Search query for name or email")
    role: Optional[str] = Field(default=None, description="Filter by role name (admin, it, user)")

class GetUserInput(BaseModel):
    user_id: UUID = Field(description="UUID of the user")

class CreateUserInput(BaseModel):
    email: EmailStr = Field(description="User email")
    full_name: str = Field(description="Full name")
    password: str = Field(description="Initial password")
    roles: List[str] = Field(default=["user"], description="List of roles (e.g. ['it', 'user'])")
    is_active: bool = Field(default=True, description="Whether the user is active")

class UpdateUserInput(BaseModel):
    user_id: UUID = Field(description="UUID of the user to update")
    email: Optional[EmailStr] = Field(default=None, description="New email")
    full_name: Optional[str] = Field(default=None, description="New full name")
    roles: Optional[List[str]] = Field(default=None, description="New list of roles")
    is_active: Optional[bool] = Field(default=None, description="Update active status")

class DeleteUserInput(BaseModel):
    user_id: UUID = Field(description="UUID of the user to delete")

def get_user_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    
    logger = logging.getLogger("app.ai.tools.user")

    async def _list_users(query: str = None, role: str = None) -> str:
        async with session_factory() as db:
            try:
                roles_filter = [role] if role else None
                raw_result = await user_service.list_users(db, roles=roles_filter, search=query)
                users, _total = unpack_items_total(raw_result)
                
                result_list = []
                for raw in users:
                    u = extract_first_matching(
                        raw,
                        lambda x: isinstance(x, User)
                        or (hasattr(x, "id") and hasattr(x, "email")),
                    )
                    if u is None:
                        logger.warning(f"Skipping unrecognized user row shape: {type(raw)}")
                        continue
                    
                    roles = getattr(u, "roles", []) or []
                    role_names: list[str] = []
                    for r in roles:
                        if isinstance(r, str):
                            role_names.append(r)
                        elif isinstance(r, dict):
                            role_names.append(str(r.get("name") or r))
                        else:
                            role_names.append(str(getattr(r, "name", r)))

                    result_list.append({
                        "id": str(u.id),
                        "email": u.email,
                        "name": u.full_name,
                        "roles": role_names,
                        "is_active": u.is_active
                    })
                
                return json.dumps(result_list)
            except Exception as e:
                logger.error(f"List users failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _get_user(user_id: UUID) -> str:
        async with session_factory() as db:
            try:
                u = await user_service.get_user(db, user_id)
                return str({
                    "id": str(u.id),
                    "email": u.email,
                    "name": u.full_name,
                    "roles": [r.name for r in u.roles],
                    "is_active": u.is_active,
                    "created_at": str(u.created_at)
                })
            except ResourceNotFound:
                return "User not found."
            except Exception as e:
                return f"Error: {str(e)}"

    async def _create_user(email: str, full_name: str, password: str, roles: List[str] = ["user"], is_active: bool = True) -> str:
        async with session_factory() as db:
            try:
                payload = UserCreate(
                    email=email,
                    full_name=full_name,
                    password=password,
                    roles=roles,
                    is_active=is_active
                )
                new_user = await user_service.create_user(db, payload, operator_id=user.id)
                return f"User created successfully. ID: {new_user.id}"
            except DuplicateResource as e:
                return f"Error: {str(e)}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except Exception as e:
                logger.error(f"Create user failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _update_user(user_id: UUID, email: str = None, full_name: str = None, roles: List[str] = None, is_active: bool = None) -> str:
        async with session_factory() as db:
            try:
                data = {}
                if email is not None: data["email"] = email
                if full_name is not None: data["full_name"] = full_name
                if roles is not None: data["roles"] = roles
                if is_active is not None: data["is_active"] = is_active
                
                if not data:
                    return "No changes provided."
                
                payload = UserUpdate(**data)
                updated_user = await user_service.update_user(db, user_id, payload, operator_id=user.id)
                return f"User updated successfully. ID: {updated_user.id}"
            except ResourceNotFound:
                return "User not found."
            except Exception as e:
                 logger.error(f"Update user failed: {str(e)}", exc_info=True)
                 return f"Error: {str(e)}"

    async def _delete_user(user_id: UUID) -> str:
        async with session_factory() as db:
            try:
                await user_service.delete_user(db, user_id, operator_id=user.id)
                return "User deleted successfully."
            except ResourceNotFound:
                return "User not found."
            except Exception as e:
                logger.error(f"Delete user failed: {str(e)}", exc_info=True)
                return f"Error: {str(e)}"

    tools = []
    
    # Permissions Logic
    # user:read
    if user.has_permission("user:read") or user.has_role("admin") or user.has_role("it"):
        tools.extend([
            StructuredTool.from_function(
                coroutine=_list_users,
                name="list_users",
                description="List users, optionally filtering by query (name/email) or role.",
                args_schema=ListUsersInput
            ),
            StructuredTool.from_function(
                coroutine=_get_user,
                name="get_user_details",
                description="Get full details of a specific user by ID.",
                args_schema=GetUserInput
            )
        ])
    
    # user:create / user:write
    # Assuming 'user:write' covers create/update/delete if not granular, 
    # but based on role service, usually admin has all.
    if user.has_role("admin") or user.has_permission("user:create"):
         tools.append(
            StructuredTool.from_function(
                coroutine=_create_user,
                name="create_user",
                description="Create a new user account.",
                args_schema=CreateUserInput
            )
         )

    if user.has_role("admin") or user.has_permission("user:update"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_update_user,
                name="update_user",
                description="Update an existing user's details.",
                args_schema=UpdateUserInput
            )
        )
        
    if user.has_role("admin") or user.has_permission("user:delete"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_delete_user,
                name="delete_user",
                description="Delete a user account.",
                args_schema=DeleteUserInput
            )
        )

    return tools

