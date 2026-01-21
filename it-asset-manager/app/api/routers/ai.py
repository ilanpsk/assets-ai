from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import logging
import time

from app.core.db import get_db
from app.core.deps import get_current_user
from app.services.ai_service import handle_chat
from app.core.logging import log_activity
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatMessage(BaseModel):
    conversation_id: str | None = None
    message: str
    history: list[dict] = []

class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    refresh_needed: bool = False

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
@log_activity
async def chat_with_agent(
    payload: ChatMessage,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    response = await handle_chat(
        db=db,
        user=current_user,
        conversation_id=payload.conversation_id,
        message=payload.message,
        history=payload.history,
    )
    return response
