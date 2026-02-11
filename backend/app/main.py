import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import get_client
from app.auth.router import router as auth_router
from app.assets.router import router as assets_router
from app.inspections.router import router as inspections_router
from app.images.router import router as images_router
from app.images.s3_service import S3ServiceUnavailableError
from app.inspections.sqs_service import SQSServiceUnavailableError

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Infrastructure Annotation API",
    description="API for infrastructure inspection image annotation",
    version="1.0.0",
)

# CORS configuration for production (CloudFront + local dev)
allowed_origins = [
    settings.FRONTEND_URL,  # From environment variable
    "http://localhost:3000",  # Local development
]

# Add CloudFront wildcard support if in production
if settings.FRONTEND_URL.startswith("https://"):
    # Extract domain and add api subdomain variant
    # e.g., https://annotation.domain.com -> also allow https://api.annotation.domain.com
    domain = settings.FRONTEND_URL.replace("https://", "").split("/")[0]
    if "api." not in domain:
        api_domain = f"https://api.{domain}"
        allowed_origins.append(api_domain)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error for {request.url}: {exc.errors()}")
    logger.error(f"Request body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(S3ServiceUnavailableError)
async def s3_unavailable_handler(request: Request, exc: S3ServiceUnavailableError):
    logger.error("S3 service unavailable: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Image service temporarily unavailable"},
    )


@app.exception_handler(SQSServiceUnavailableError)
async def sqs_unavailable_handler(request: Request, exc: SQSServiceUnavailableError):
    logger.error("SQS service unavailable: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Queue service temporarily unavailable"},
    )


app.include_router(auth_router)
app.include_router(assets_router)
app.include_router(inspections_router)
app.include_router(images_router)


@app.get("/api/health")
def health_check():
    try:
        client = get_client()
        client.admin.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"

    return {
        "status": "healthy" if mongo_status == "connected" else "degraded",
        "mongodb": mongo_status,
    }
