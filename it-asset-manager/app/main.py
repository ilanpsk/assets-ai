from contextlib import asynccontextmanager
import time
import uuid
import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging, request_id_ctx_var
from app.core.db import init_db
from app.core.rate_limit import limiter
from app.core.exceptions import (
    ResourceNotFound,
    DuplicateResource,
    ValidationException,
    PermissionDenied,
    AuthenticationError,
)
from app.api.routers import (
    auth,
    users,
    assets,
    asset_types,
    asset_statuses,
    custom_fields,
    requests as requests_router,
    search,
    imports,
    integrations,
    ai,
    admin,
    audit_logs,
    asset_sets,
    system,
    dashboard,
    reports,
    roles,
    snapshots,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await init_db()
    yield
    # cleanup if needed

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request_id_ctx_var.set(request_id)
        
        start_time = time.time()
        
        logger = logging.getLogger("app.request")
        logger.info(f"START request method={request.method} path={request.url.path}")
        
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            logger.info(
                f"END request method={request.method} path={request.url.path} "
                f"status={response.status_code} duration={process_time:.2f}ms"
            )
            
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"FAIL request method={request.method} path={request.url.path} "
                f"duration={process_time:.2f}ms error={str(e)}",
                exc_info=True
            )
            raise e

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],          # tighten later
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
    app.include_router(asset_types.router, prefix="/api/asset-types", tags=["asset-types"])
    app.include_router(asset_statuses.router, prefix="/api/asset-statuses", tags=["asset-statuses"])
    app.include_router(custom_fields.router, prefix="/api/custom-fields", tags=["custom-fields"])
    app.include_router(requests_router.router, prefix="/api/requests", tags=["requests"])
    app.include_router(search.router, prefix="/api/search", tags=["search"])
    app.include_router(imports.router, prefix="/api/imports", tags=["imports"])
    app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
    app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["audit-logs"])
    app.include_router(asset_sets.router, prefix="/api/asset-sets", tags=["asset-sets"])
    app.include_router(system.router, prefix="/api/system", tags=["system"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
    app.include_router(roles.router, prefix="/api/roles", tags=["roles"])
    app.include_router(snapshots.router, prefix="/api/snapshots", tags=["snapshots"])

    @app.exception_handler(ResourceNotFound)
    async def resource_not_found_handler(request, exc):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(DuplicateResource)
    async def duplicate_resource_handler(request, exc):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ValidationException)
    async def validation_exception_handler(request, exc):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(PermissionDenied)
    async def permission_denied_handler(request, exc):
        return JSONResponse(status_code=403, content={"detail": str(exc)})

    @app.exception_handler(AuthenticationError)
    async def authentication_error_handler(request, exc):
        return JSONResponse(status_code=401, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger = logging.getLogger("app.error")
        logger.error(f"Global Exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(exc)},
        )

    return app

app = create_app()
