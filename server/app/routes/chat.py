"""
Chat route — LLM-powered MSME credit advisor.
POST /api/v1/chat
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.config import settings
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.chat_service import get_chat_response

router = APIRouter(tags=["Chat"])


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: list[ChatMessage] = []
    language: str = Field(default="en", pattern="^(en|kn|hi)$")


class ChatResponse(BaseModel):
    success: bool = True
    data: dict


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    user: User = Depends(get_current_user),
):
    """
    Send a message to the CreditSaathi AI advisor.
    The chatbot has RAG access to the user's MSME data, score, and loan information.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI chatbot service is not configured. Please set OPENROUTER_API_KEY.",
            },
        )

    # Convert conversation history to dicts
    history = [{"role": m.role, "content": m.content} for m in body.conversation_history]

    # Get AI response with RAG context
    response_text = await get_chat_response(
        user_id=str(user.id),
        message=body.message,
        conversation_history=history,
        api_key=api_key,
        language=body.language,
    )

    return ChatResponse(
        success=True,
        data={
            "reply": response_text,
            "model": "CreditSaathi AI",
        },
    )
