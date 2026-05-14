"""Parser routes — /api/v1/parser/* endpoints for invoice extraction."""

from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import JSONResponse

from app.models.user import User
from app.services.auth_service import get_current_user
from app.parser.parser_service import parse_invoice_image

router = APIRouter(prefix="/parser", tags=["Parser"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_SIZE_MB = 10


@router.post("/invoice")
async def parse_invoice(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a GST invoice image and get structured data back.

    Accepts PNG, JPEG, or WebP images up to 10 MB.
    Returns parsed invoice JSON using Gemma 4 31B vision model.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_FILE_TYPE",
                    "message": f"Unsupported file type: {file.content_type}. Use PNG, JPEG, or WebP.",
                },
            },
        )

    # Read file bytes
    image_bytes = await file.read()

    # Validate size
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File exceeds {MAX_SIZE_MB} MB limit.",
                },
            },
        )

    # Parse using Gemma
    result = await parse_invoice_image(image_bytes, file.content_type)

    if "error" in result:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "PARSE_FAILED",
                    "message": result["error"],
                    "details": result.get("raw_text", None),
                },
            },
        )

    return {
        "success": True,
        "message": "Invoice parsed successfully",
        "data": result,
    }
