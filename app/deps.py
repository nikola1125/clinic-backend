from fastapi import Depends, Header, HTTPException, Request
from redis import Redis

from app.core.config import settings
from app.core.security import Actor, validate_bearer_token, validate_service_api_key


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


async def get_actor(
    request: Request,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> Actor | None:
    # Service-to-service: X-Api-Key header
    service_actor = validate_service_api_key(x_api_key)
    if service_actor:
        request.state.actor = service_actor
        return service_actor

    # Bearer JWT
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]

    try:
        actor = await validate_bearer_token(token)
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e

    request.state.actor = actor
    return actor


def require_admin(actor: Actor | None = Depends(get_actor)) -> Actor:
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")
    if actor.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return actor


def require_doctor(actor: Actor | None = Depends(get_actor)) -> Actor:
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")
    if actor.role != "doctor":
        raise HTTPException(status_code=403, detail="Doctor only")
    if not actor.doctor_id:
        raise HTTPException(status_code=403, detail="doctor_id claim required")
    return actor


def require_patient(actor: Actor | None = Depends(get_actor)) -> Actor:
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")
    if actor.role != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")
    if not actor.patient_id:
        raise HTTPException(status_code=403, detail="patient_id claim required")
    return actor


def rate_limit(
    request: Request,
    actor: Actor | None = Depends(get_actor),
    redis: Redis = Depends(get_redis),
):
    if actor and actor.sub != "unknown":
        key = f"rl:{actor.sub}:{request.url.path}"
    else:
        # Fallback to real IP; handle trusted proxy headers if needed
        forwarded_for = request.headers.get("x-forwarded-for")
        ip = (forwarded_for.split(",")[0].strip() if forwarded_for
              else (request.client.host if request.client else "unknown"))
        key = f"rl:ip:{ip}:{request.url.path}"

    n = redis.incr(key)
    if n == 1:
        redis.expire(key, 60)
    if n > settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
