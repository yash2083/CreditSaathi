"""
Sarvam Speech-to-Text Service
────────────────────────────
Transcribes uploaded audio files to text using Sarvam STT.
"""

import httpx
import logging
from typing import Optional
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio(
    file: UploadFile,
    language_code: Optional[str],
    model: Optional[str],
    mode: Optional[str],
) -> dict:
    if not settings.SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not configured")

    base_url = (settings.SARVAM_BASE_URL or "https://api.sarvam.ai").rstrip("/")
    url = f"{base_url}/speech-to-text"

    data = {}
    if model:
        data["model"] = model
    if mode:
        data["mode"] = mode
    if language_code:
        data["language_code"] = language_code

    file_bytes = await file.read()
    files = {
        "file": (
            file.filename or "audio.wav",
            file_bytes,
            file.content_type or "application/octet-stream",
        )
    }

    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, data=data, files=files)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as exc:
        logger.warning("Sarvam STT request timed out")
        raise RuntimeError("Sarvam STT request timed out") from exc
    except httpx.HTTPStatusError as exc:
        detail = None
        try:
            detail = exc.response.json()
        except ValueError:
            detail = exc.response.text
        logger.warning(
            "Sarvam STT error: status=%s body=%s",
            exc.response.status_code,
            detail,
        )
        raise RuntimeError(f"Sarvam STT error: {detail}") from exc
    except httpx.RequestError as exc:
        logger.warning("Sarvam STT request failed: %s", exc)
        raise RuntimeError("Sarvam STT request failed") from exc
