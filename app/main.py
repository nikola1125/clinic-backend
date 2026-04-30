from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.middleware.audit import AuditMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import hash_password
from app.routers import admin, applications, contact, doctor, public, auth, registry, triage, websocket


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


# ---------------------------------------------------------------------------
# Lifespan (admin seed)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        admin_email = settings.admin_seed_email
        hashed = hash_password(settings.admin_seed_password)
        existing = db.scalar(select(User).where(User.email == admin_email))
        if not existing:
            db.add(User(email=admin_email, hashed_pw=hashed, role="admin"))
            print(f"[seed] Created admin user: {admin_email}", flush=True)
        else:
            # Always sync the password so env-var changes take effect on redeploy.
            existing.hashed_pw = hashed
            print(f"[seed] Admin user already exists, password synced: {admin_email}", flush=True)
        db.commit()
    except Exception as exc:
        print(f"[seed] ERROR during admin seed: {exc}", flush=True)
    finally:
        db.close()
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Clinic API", lifespan=lifespan, docs_url=None, redoc_url=None)

# ── Request body size limit (1 MB) ──────────────────────────────────────────
MAX_BODY_SIZE = 1_048_576  # 1 MB

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(status_code=413, content={"detail": "Request body too large"})
    return await call_next(request)

# ── Other middleware ─────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(AuditMiddleware)

# ── CORS (added last so it runs FIRST in FastAPI's LIFO stack) ───────────────
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id", "X-Api-Key"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(public.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(doctor.router, prefix="/doctor", tags=["doctor"])
app.include_router(registry.router, prefix="/registry", tags=["registry"])
app.include_router(triage.router, prefix="/api", tags=["triage"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(contact.router, prefix="/api", tags=["contact"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/health")
def health():
    return {"ok": True}
