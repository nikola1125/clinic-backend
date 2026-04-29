import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings


@dataclass
class Actor:
    sub: str
    role: Literal["admin", "doctor", "patient", "service"]
    doctor_id: str | None = None
    patient_id: str | None = None


# ---------------------------------------------------------------------------
# Password hashing (bcrypt)
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT (HS256 — internal tokens only, no Keycloak)
# ---------------------------------------------------------------------------

def create_access_token(
    sub: str,
    role: str,
    doctor_id: str | None = None,
    patient_id: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    exp_minutes = expires_minutes or settings.jwt_expire_minutes
    payload: dict = {
        "sub": sub,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=exp_minutes),
        "jti": secrets.token_hex(16),
    }
    if doctor_id:
        payload["doctor_id"] = doctor_id
    if patient_id:
        payload["patient_id"] = patient_id
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> Actor:
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=["HS256"],
            options={"require": ["sub", "role", "exp", "iat"]},
        )
    except InvalidTokenError as e:
        raise PermissionError(f"Invalid token: {e}") from e

    sub = str(claims.get("sub") or "")
    role = str(claims.get("role") or "")

    if role not in ("admin", "doctor", "patient", "service"):
        raise PermissionError("Token has unknown role")

    return Actor(
        sub=sub,
        role=role,  # type: ignore[arg-type]
        doctor_id=claims.get("doctor_id"),
        patient_id=claims.get("patient_id"),
    )


# ---------------------------------------------------------------------------
# Service API key (service-to-service)
# ---------------------------------------------------------------------------

def validate_service_api_key(key: str | None) -> Actor | None:
    if not key:
        return None
    keys = {x.strip() for x in settings.service_api_keys.split(",") if x.strip()}
    if key in keys:
        return Actor(sub="service", role="service")
    return None


# ---------------------------------------------------------------------------
# validate_bearer_token — called by deps.get_actor
# ---------------------------------------------------------------------------

async def validate_bearer_token(token: str) -> Actor:
    """Validate an internal JWT; raises PermissionError on failure."""
    return decode_access_token(token)