import uuid
import re
import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.session import db_session
from app.db.models import AuditLog

logger = logging.getLogger(__name__)

_REQUEST_ID_RE = re.compile(r"^[\w\-]{1,64}$")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_id = request.headers.get("x-request-id") or ""
        if _REQUEST_ID_RE.match(raw_id):
            request_id = raw_id
        else:
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)

        actor = getattr(request.state, "actor", None)

        try:
            with db_session() as db:
                db.add(
                    AuditLog(
                        request_id=request_id,
                        actor_sub=getattr(actor, "sub", None),
                        actor_role=getattr(actor, "role", None),
                        action="http_request",
                        resource="http",
                        resource_id=None,
                        method=request.method,
                        path=request.url.path,
                        ip=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                    )
                )
                db.commit()
        except Exception:
            logger.exception("Failed to write audit log")

        return response
