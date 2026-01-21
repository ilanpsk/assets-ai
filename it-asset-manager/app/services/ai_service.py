from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.messages import HumanMessage, AIMessage
import logging
from fastapi import HTTPException

from app.ai.core.llm import get_llm_client
from app.ai.core.graph import create_agent_graph
from app.ai.core.errors import normalize_ai_exception
from app.ai.tools.asset_tools import get_asset_tools
from app.ai.tools.user_tools import get_user_tools
from app.ai.tools.log_tools import get_log_tools
from app.ai.tools.config_tools import get_config_tools
from app.ai.tools.import_tools import get_import_tools
from app.ai.tools.request_tools import get_request_tools
from app.ai.tools.role_tools import get_role_tools
from app.ai.tools.report_tools import get_report_tools
from app.ai.tools.snapshot_tools import get_snapshot_tools
from app.ai.tools.budget_tools import get_budget_tools
from app.ai.tools.files import inspect_file
from app.core.config import settings
from app.core.db import async_session_factory
from app.core.logging import log_activity, request_id_ctx_var, audit_origin_ctx_var
from app.models.system_setting import SystemSetting
from app.models.user import User

logger = logging.getLogger(__name__)

@log_activity
async def handle_chat(
    db: AsyncSession,
    user: User,
    conversation_id: str | None,
    message: str,
    history: list[dict] | None = None,
):
    provider = None
    model_name = None
    origin_token = None
    
    try:
        # Set AI origin context for audit logs
        origin_token = audit_origin_ctx_var.set("ai")
        
        logger.debug(f"Initializing AI Agent for user {user.id}")
        
        # Initialize history if not provided
        if history is None:
            history = []
        
        # Fetch System Settings for AI
        res = await db.execute(select(SystemSetting).where(SystemSetting.key.in_(['ai_provider', 'ai_api_key', 'ai_model'])))
        settings_rows = res.scalars().all()
        settings_map = {s.key: s.value for s in settings_rows}
        
        # Resolve settings (DB overrides Env)
        api_key = settings_map.get('ai_api_key') or settings.AI_API_KEY
        provider = settings_map.get('ai_provider') or settings.AI_PROVIDER
        model_name = settings_map.get('ai_model') or getattr(settings, "AI_MODEL", None)

        # Validate settings
        if not api_key or not provider:
            raise ValueError("AI Service configuration missing (API Key or Provider not set).")
        
        llm = get_llm_client(
            api_key=api_key,
            provider=provider,
            model_name=model_name
        )
        
        # 1. Initialize Tools (Bind DB Factory for parallel execution safety)
        # We pass the session factory so each tool execution gets its own session
        asset_tools = get_asset_tools(async_session_factory, user)
        user_tools = get_user_tools(async_session_factory, user)
        log_tools = get_log_tools(async_session_factory, user)
        config_tools = get_config_tools(async_session_factory, user)
        import_tools = get_import_tools(async_session_factory, user)
        request_tools = get_request_tools(async_session_factory, user)
        role_tools = get_role_tools(async_session_factory, user)
        report_tools = get_report_tools(async_session_factory, user)
        snapshot_tools = get_snapshot_tools(async_session_factory, user)
        budget_tools = get_budget_tools(async_session_factory, user)
        
        tools = (
            asset_tools
            + user_tools
            + log_tools
            + config_tools
            + import_tools
            + request_tools
            + role_tools
            + report_tools
            + snapshot_tools
            + budget_tools
        )
        
        # Only allow file inspection for privileged users
        if user.has_role("admin") or user.has_role("it"):
            tools = tools + [inspect_file]

        logger.debug(f"Tools loaded: {[t.name for t in tools]}")
        
        # 2. Create Agent
        agent = create_agent_graph(llm, tools)
        
        # 3. Prepare State
        # Determine role (naive check, can be improved)
        role = "user"
        if hasattr(user, "has_role"):
            if user.has_role("admin"):
                role = "admin"
            elif user.has_role("it"):
                role = "it"
        
        logger.info(f"Running Agent | Role: {role} | Message: {message}")

        # Construct message history
        chat_history = []
        for msg in history:
            role_type = msg.get('role')
            content = msg.get('content')
            if role_type == 'user':
                chat_history.append(HumanMessage(content=content))
            elif role_type == 'assistant':
                chat_history.append(AIMessage(content=content))
        
        # Add current message
        chat_history.append(HumanMessage(content=message))

        initial_state = {
            "messages": chat_history,
            "user_id": str(user.id),
            "role": role
        }
        
        # 4. Run
        # ainvoke returns the final state
        result = await agent.ainvoke(initial_state)
        
        # Check for write operations to signal refresh
        refresh_needed = False
        write_tools = {
            "create_asset", "update_asset", "delete_asset", "bulk_delete_assets",
            "import_assets", "execute_smart_import",
            "create_user", "update_user", "delete_user",
            "execute_user_import",
            "create_asset_set", "update_asset_set", "delete_asset_set",
            "create_asset_type", "update_asset_type", "delete_asset_type",
            "create_asset_status", "update_asset_status", "delete_asset_status",
            "create_custom_field", "update_custom_field", "delete_custom_field",
            "create_request", "update_request", "delete_request",
            "create_role", "update_role", "delete_role", "update_role_permissions",
            "create_snapshot", "rollback_snapshot", "delete_snapshot",
        }
        
        messages = result["messages"]
        for msg in messages:
            # Check AIMessages for tool_calls
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    if tool_call.get("name") in write_tools:
                        refresh_needed = True
                        break
            if refresh_needed:
                break

        # Extract the last message from the assistant
        last_message = messages[-1]
        
        reply = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        logger.debug(f"Agent Reply: {reply}")
        
        return {
            "conversation_id": conversation_id or "new",
            "message": reply,
            "refresh_needed": refresh_needed
        }
    except Exception as e:
        # Get request ID from context
        request_id = request_id_ctx_var.get()
        
        # Log the full exception first
        logger.exception(f"Error in handle_chat | Provider: {provider} | Model: {model_name} | User: {user.id} | RequestID: {request_id}")
        
        # Normalize and re-raise as HTTPException
        status_code, detail = normalize_ai_exception(
            e, 
            provider=str(provider) if provider else None, 
            model=str(model_name) if model_name else None,
            request_id=request_id
        )
        raise HTTPException(status_code=status_code, detail=detail)
    finally:
        if origin_token:
            audit_origin_ctx_var.reset(origin_token)
