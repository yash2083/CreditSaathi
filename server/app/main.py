"""
CreditSaathi FastAPI Backend
─────────────────────────────
Drop-in replacement for the Node.js/Express server.
All routes are under /api/v1/* to maintain frontend compatibility.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import connect_db, disconnect_db
from app.routes.auth import router as auth_router
from app.routes.msme import router as msme_router
from app.routes.gst import router as gst_router
from app.routes.transactions import router as transactions_router
from app.routes.scoring import router as scoring_router
from app.routes.loans import router as loans_router
from app.routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Credit & Business Intelligence Platform for MSMEs",
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGIN, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ─────────────────────────────────────
@app.get("/api/v1/health")
async def health_check():
    from datetime import datetime
    return {
        "success": True,
        "message": "CreditSaathi API is running",
        "data": {
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.utcnow().isoformat(),
        },
    }


# ── Mount Routers ────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")
app.include_router(msme_router, prefix="/api/v1")
app.include_router(gst_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(scoring_router, prefix="/api/v1")
app.include_router(loans_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


# ── 404 Handler ──────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Route not found"},
        },
    )


# ── Global Error Handler ─────────────────────────────
@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred" if settings.ENVIRONMENT == "production" else str(exc),
            },
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
