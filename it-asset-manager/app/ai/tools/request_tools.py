from typing import List, Optional, Callable
from uuid import UUID
import logging
import json

from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.request import Request
from app.core.exceptions import ResourceNotFound, PermissionDenied, ValidationException
from app.schemas.request import RequestCreate, RequestUpdate
from app.services import request_service
from app.ai.tools.tool_utils import unpack_items_total, extract_first_matching


class ListRequestsInput(BaseModel):
    mine_only: bool = Field(
        default=False,
        description="If true, only return requests created by the current user",
    )


class CreateRequestInput(BaseModel):
    title: str = Field(description="Title of the request")
    description: Optional[str] = Field(default=None, description="Details about the request")
    status: Optional[str] = Field(default=None, description="Optional status override")
    request_type: Optional[str] = Field(default=None, description="Type of request")
    asset_id: Optional[UUID] = Field(default=None, description="Linked asset ID, if any")


class GetRequestInput(BaseModel):
    request_id: UUID = Field(description="UUID of the request")


class UpdateRequestInput(BaseModel):
    request_id: UUID = Field(description="UUID of the request")
    title: Optional[str] = Field(default=None, description="New title")
    description: Optional[str] = Field(default=None, description="New description")
    status: Optional[str] = Field(default=None, description="New status")
    request_type: Optional[str] = Field(default=None, description="New request type")
    asset_id: Optional[UUID] = Field(default=None, description="New linked asset ID")


class DeleteRequestInput(BaseModel):
    request_id: UUID = Field(description="UUID of the request to delete")


def get_request_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    """
    Tools for managing requests (tickets) with permission checks aligned to API routes.
    """
    logger = logging.getLogger("app.ai.tools.request")

    async def _list_requests(mine_only: bool = False) -> str:
        async with session_factory() as db:
            try:
                requester_id = None
                if mine_only or not user.has_permission("request:view_all"):
                    requester_id = user.id

                raw_result = await request_service.list_requests(db, requester_id=requester_id)
                items, _total = unpack_items_total(raw_result)
                if not items:
                    return json.dumps([])

                output = []
                for raw in items:
                    r = extract_first_matching(
                        raw,
                        lambda x: isinstance(x, Request)
                        or (hasattr(x, "id") and hasattr(x, "title")),
                    )
                    if r is None:
                        logger.warning(f"Skipping unrecognized request row shape: {type(raw)}")
                        continue
                    
                    output.append(
                        {
                            "id": str(r.id),
                            "title": r.title,
                            "status": str(getattr(r.status, "value", r.status)),
                            "type": str(getattr(r.request_type, "value", r.request_type)),
                            "asset_id": str(r.asset_id) if r.asset_id else None,
                            "requester": r.requester.email if r.requester else None,
                            "created_at": str(r.created_at),
                        }
                    )
                return json.dumps(output)
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"List requests failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _create_request(
        title: str,
        description: str = None,
        status: str = None,
        request_type: str = None,
        asset_id: UUID = None,
    ) -> str:
        async with session_factory() as db:
            try:
                payload_kwargs = {
                    "title": title,
                    "description": description,
                    "asset_id": asset_id,
                }
                if status is not None:
                    payload_kwargs["status"] = status
                if request_type is not None:
                    payload_kwargs["request_type"] = request_type

                payload = RequestCreate(**payload_kwargs)
                obj = await request_service.create_request(db, payload, requester_id=user.id)
                return f"Request created. ID: {obj.id}"
            except ValidationException as e:
                return f"Validation Error: {str(e)}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"Create request failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _get_request(request_id: UUID) -> str:
        async with session_factory() as db:
            try:
                obj = await request_service.get_request(db, request_id)

                # Enforce ownership if user lacks view_all
                if not user.has_permission("request:view_all") and obj.requester_id != user.id:
                    raise PermissionDenied("Not authorized to view this request.")

                return str(
                    {
                        "id": str(obj.id),
                        "title": obj.title,
                        "description": obj.description,
                        "status": str(obj.status),
                        "type": str(obj.request_type),
                        "asset_id": str(obj.asset_id) if obj.asset_id else None,
                        "requester_id": str(obj.requester_id) if obj.requester_id else None,
                        "created_at": str(obj.created_at),
                        "updated_at": str(obj.updated_at),
                    }
                )
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except ResourceNotFound:
                return "Request not found."
            except Exception as e:
                logger.error(f"Get request failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _update_request(
        request_id: UUID,
        title: str = None,
        description: str = None,
        status: str = None,
        request_type: str = None,
        asset_id: UUID = None,
    ) -> str:
        async with session_factory() as db:
            try:
                obj = await request_service.get_request(db, request_id)
                if not user.has_permission("request:view_all") and obj.requester_id != user.id:
                    raise PermissionDenied("Not authorized to update this request.")

                data = {}
                if title is not None:
                    data["title"] = title
                if description is not None:
                    data["description"] = description
                if status is not None:
                    data["status"] = status
                if request_type is not None:
                    data["request_type"] = request_type
                if asset_id is not None:
                    data["asset_id"] = asset_id

                if not data:
                    return "No changes provided."

                payload = RequestUpdate(**data)
                updated = await request_service.update_request(db, request_id, payload)
                return f"Request updated. ID: {updated.id}"
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except ResourceNotFound:
                return "Request not found."
            except Exception as e:
                logger.error(f"Update request failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _delete_request(request_id: UUID) -> str:
        async with session_factory() as db:
            try:
                obj = await request_service.get_request(db, request_id)
                if not user.has_permission("request:view_all") and obj.requester_id != user.id:
                    raise PermissionDenied("Not authorized to delete this request.")

                await request_service.delete_request(db, request_id)
                return "Request deleted."
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except ResourceNotFound:
                return "Request not found."
            except Exception as e:
                logger.error(f"Delete request failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools: List[StructuredTool] = []

    if user.has_permission("request:read") or user.has_role("admin") or user.has_role("it"):
        tools.extend(
            [
                StructuredTool.from_function(
                    coroutine=_list_requests,
                    name="list_requests",
                    description="List requests (tickets). Honors access scope; set mine_only=true to force filtering to your own requests.",
                    args_schema=ListRequestsInput,
                ),
                StructuredTool.from_function(
                    coroutine=_get_request,
                    name="get_request_details",
                    description="Get details for a specific request.",
                    args_schema=GetRequestInput,
                ),
            ]
        )

    if user.has_permission("request:create") or user.has_role("admin") or user.has_role("it"):
        tools.append(
            StructuredTool.from_function(
                coroutine=_create_request,
                name="create_request",
                description="Create a new request/ticket.",
                args_schema=CreateRequestInput,
            )
        )

    if user.has_permission("request:update") or user.has_role("admin") or user.has_role("it"):
        tools.extend(
            [
                StructuredTool.from_function(
                    coroutine=_update_request,
                    name="update_request",
                    description="Update an existing request.",
                    args_schema=UpdateRequestInput,
                ),
                StructuredTool.from_function(
                    coroutine=_delete_request,
                    name="delete_request",
                    description="Delete a request.",
                    args_schema=DeleteRequestInput,
                ),
            ]
        )

    return tools
