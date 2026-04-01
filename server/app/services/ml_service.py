"""ML service caller — mirrors the Node.js ml.service.js."""

import httpx

from app.config import settings


async def call_ml_service(features: dict) -> dict:
    """Call the ML scoring microservice."""
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                f"{settings.ML_SERVICE_URL}/score",
                json=features,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.ConnectError:
        raise Exception("ML scoring service is unavailable. Please try again later.")
    except httpx.TimeoutException:
        raise Exception("ML scoring service timed out. Please try again.")
    except httpx.HTTPStatusError as e:
        detail = e.response.json().get("detail", "ML service error") if e.response else "ML service error"
        raise Exception(detail)


async def check_ml_health() -> dict:
    """Check ML service health."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ML_SERVICE_URL}/health")
            return response.json()
    except Exception:
        return {"status": "unavailable"}
