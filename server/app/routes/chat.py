"""
Chat route — LLM-powered MSME credit advisor.
POST /api/v1/chat
"""

import json
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from pydantic import BaseModel, Field
from typing import Optional

from app.config import settings
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.chat_service import get_chat_response
from app.services.speech_service import transcribe_audio

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


class ChatSpeechResponse(BaseModel):
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
    api_key = settings.LLM_API_KEY or settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI chatbot service is not configured. Please set LLM_API_KEY.",
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


@router.post("/chat/speech", response_model=ChatSpeechResponse)
async def chat_speech_endpoint(
    file: UploadFile = File(...),
    language: str = Form("en"),
    conversation_history: Optional[str] = Form(None),
    stt_language_code: Optional[str] = Form(None),
    stt_model: Optional[str] = Form(None),
    stt_mode: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
):
    """
    Speech-to-text + chat endpoint.
    Accepts an audio file, transcribes it using Sarvam STT, then sends the transcript to the LLM.
    """
    api_key = settings.LLM_API_KEY or settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "AI chatbot service is not configured. Please set LLM_API_KEY.",
            },
        )

    if not settings.SARVAM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "SERVICE_UNAVAILABLE",
                "message": "Speech-to-text service is not configured. Please set SARVAM_API_KEY.",
            },
        )

    if language not in {"en", "kn", "hi"}:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "language must be one of: en, kn, hi",
            },
        )

    history: list[dict] = []
    if conversation_history:
        try:
            parsed = json.loads(conversation_history)
            if isinstance(parsed, list):
                for item in parsed:
                    role = item.get("role") if isinstance(item, dict) else None
                    content = item.get("content") if isinstance(item, dict) else None
                    if role in {"user", "assistant"} and isinstance(content, str):
                        history.append({"role": role, "content": content})
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "conversation_history must be valid JSON.",
                },
            )

    try:
        stt_result = await transcribe_audio(
            file=file,
            language_code=stt_language_code or settings.SARVAM_LANGUAGE_CODE,
            model=stt_model or settings.SARVAM_STT_MODEL,
            mode=stt_mode or settings.SARVAM_STT_MODE,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "STT_ERROR",
                "message": str(exc),
            },
        )

    transcript = (stt_result.get("transcript") or "").strip()
    if not transcript:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "STT_EMPTY",
                "message": "No transcript returned from speech-to-text service.",
            },
        )

    response_text = await get_chat_response(
        user_id=str(user.id),
        message=transcript,
        conversation_history=history,
        api_key=api_key,
        language=language,
    )

    return ChatSpeechResponse(
        success=True,
        data={
            "transcript": transcript,
            "reply": response_text,
            "stt": {
                "request_id": stt_result.get("request_id"),
                "language_code": stt_result.get("language_code"),
                "language_probability": stt_result.get("language_probability"),
            },
        },
    )
