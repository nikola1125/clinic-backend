from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy import select
import hmac
import hashlib
import base64
import time
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from app.core.security import decode_access_token, Actor
from app.db.session import SessionLocal
from app.db.models import ChatMessage, Appointment, Doctor, Patient
from app.deps import get_actor, rate_limit
from app.core.config import settings
from app.schemas import MeetContextOut, AppointmentOut

router = APIRouter()


def _turn_secret() -> str:
    """Fail loudly if the TURN shared secret is missing (hmac mode only)."""
    secret = settings.turn_secret
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="TURN_SECRET is not configured (required for hmac TURN mode)",
        )
    return secret


class Room:
    """Per-appointment signaling room.

    Holds at most two signaling peers (doctor + patient). An admin may
    observe but never participates in SDP/ICE relay.

    Each time both signaling peers are concurrently present we mint a fresh
    `session_id` so clients can detect a new call and reset their peer
    connection state — guaranteeing no residual ICE / SDP bleeds across calls
    on the same appointment.
    """

    def __init__(self, appointment_id: str):
        self.appointment_id = appointment_id
        # websocket -> role
        self.peers: Dict[WebSocket, str] = {}
        # Current call session id; None when fewer than 2 signaling peers present
        self.session_id: Optional[str] = None

    def signaling_peers(self) -> Dict[WebSocket, str]:
        return {ws: role for ws, role in self.peers.items() if role in ("doctor", "patient")}

    def peer_by_role(self, role: str) -> Optional[WebSocket]:
        for ws, r in self.peers.items():
            if r == role:
                return ws
        return None


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def _room(self, appointment_id: str) -> Room:
        if appointment_id not in self.rooms:
            self.rooms[appointment_id] = Room(appointment_id)
        return self.rooms[appointment_id]

    async def _send(self, ws: WebSocket, message: dict) -> bool:
        try:
            await ws.send_json(message)
            return True
        except Exception:
            return False

    async def _broadcast_others(self, room: Room, sender: WebSocket, message: dict):
        for ws in list(room.peers.keys()):
            if ws is not sender:
                await self._send(ws, message)

    async def connect(self, websocket: WebSocket, appointment_id: str, role: str) -> bool:
        await websocket.accept()
        room = self._room(appointment_id)

        # Evict any stale same-role socket (network drop / tab refresh).
        # Admins may coexist, so skip the check for them.
        if role in ("doctor", "patient"):
            stale = room.peer_by_role(role)
            if stale is not None:
                room.peers.pop(stale, None)
                try:
                    await stale.send_json({
                        "type": "session-evicted",
                        "reason": "Another connection for this role was established",
                    })
                    await stale.close(code=1000, reason="Replaced by newer connection")
                except Exception:
                    pass

        room.peers[websocket] = role

        # Tell the new peer about anyone already in the room
        for existing_ws, existing_role in list(room.peers.items()):
            if existing_ws is websocket:
                continue
            await self._send(websocket, {"type": "peer-joined", "role": existing_role})

        # Notify others
        await self._broadcast_others(room, websocket, {"type": "peer-joined", "role": role})

        # If doctor + patient now both present, mint a fresh session and
        # announce it so both peers reset their pc state.
        sig = room.signaling_peers()
        if len(sig) == 2 and role in ("doctor", "patient"):
            room.session_id = uuid.uuid4().hex
            for ws in sig.keys():
                await self._send(ws, {
                    "type": "session-ready",
                    "session_id": room.session_id,
                    "appointment_id": appointment_id,
                })

        return True

    async def disconnect(self, websocket: WebSocket, appointment_id: str):
        room = self.rooms.get(appointment_id)
        if not room:
            return
        role = room.peers.pop(websocket, None)
        if role is None:
            return

        # End the current session when a signaling peer leaves
        ending_session = None
        if role in ("doctor", "patient") and room.session_id is not None:
            ending_session = room.session_id
            room.session_id = None

        if ending_session is not None:
            for ws in list(room.peers.keys()):
                await self._send(ws, {
                    "type": "session-ended",
                    "session_id": ending_session,
                    "role": role,
                })

        await self._broadcast_others(room, websocket, {"type": "peer-left", "role": role})

        if not room.peers:
            self.rooms.pop(appointment_id, None)

    async def relay_signaling(self, sender: WebSocket, appointment_id: str, message: dict):
        """Relay SDP/ICE to the OTHER signaling peer only, and only within the
        current session. Messages carrying a stale session_id are dropped."""
        room = self.rooms.get(appointment_id)
        if room is None:
            return
        sender_role = room.peers.get(sender)
        if sender_role not in ("doctor", "patient"):
            return
        # If the message is tagged with a session_id, reject if it doesn't
        # match the current session (prevents late packets from a previous call).
        msg_session = message.get("session_id")
        if msg_session is not None and msg_session != room.session_id:
            return
        # Always stamp the current session_id for the receiver to verify.
        message = {**message, "session_id": room.session_id}
        for ws, role in list(room.signaling_peers().items()):
            if ws is sender:
                continue
            await self._send(ws, message)

    async def broadcast(self, appointment_id: str, message: dict):
        room = self.rooms.get(appointment_id)
        if room is None:
            return
        for ws in list(room.peers.keys()):
            await self._send(ws, message)


manager = ConnectionManager()


def get_actor_from_token(token: str) -> Actor | None:
    try:
        return decode_access_token(token)
    except Exception:
        return None


def save_chat_message(appointment_id: str, sender: str, text: str | None = None, image_url: str | None = None):
    db = SessionLocal()
    try:
        msg = ChatMessage(
            appointment_id=appointment_id,
            sender=sender,
            message=text or "",
            image_url=image_url,
        )
        db.add(msg)
        db.commit()
        return {
            "id": str(msg.id),
            "appointment_id": str(msg.appointment_id),
            "sender": msg.sender,
            "message": msg.message,
            "image_url": msg.image_url,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
    finally:
        db.close()


@router.get("/meet/context/{appointment_id}", response_model=MeetContextOut, dependencies=[Depends(rate_limit)])
async def get_meet_context(
    appointment_id: str,
    actor: Actor | None = Depends(get_actor),
):
    """Return appointment + resolved role for the authenticated user.

    Use this so the client does not rely on `?role=` (easy to get wrong — doctor
    must send the doctor JWT, patient the patient JWT).
    """
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = SessionLocal()
    try:
        appt = db.scalar(select(Appointment).where(Appointment.id == appointment_id))
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")

        is_doctor = actor.role == "doctor" and str(appt.doctor_id) == actor.doctor_id
        is_patient = actor.role == "patient" and str(appt.patient_id) == actor.patient_id

        if not is_doctor and not is_patient:
            raise HTTPException(status_code=403, detail="Not a participant in this appointment")

        role = "doctor" if is_doctor else "patient"

        ok, reason = _check_appointment_joinable(appt, actor.role)
        if not ok:
            raise HTTPException(status_code=403, detail=reason)

        doc = db.scalar(select(Doctor).where(Doctor.id == appt.doctor_id))
        pat = db.scalar(select(Patient).where(Patient.id == appt.patient_id))

        return MeetContextOut(
            role=role,
            appointment=AppointmentOut.model_validate(appt),
            doctor_name=doc.name if doc else "Doctor",
            patient_full_name=pat.full_name if pat else "Patient",
        )
    finally:
        db.close()


def _check_appointment_joinable(appt: Appointment, actor_role: str) -> tuple[bool, str]:
    """Return (ok, reason) for whether this appointment is currently joinable."""
    if actor_role == "admin":
        return True, ""  # Admins bypass time/status gates

    if appt.status in ("rejected", "completed"):
        return False, f"Appointment is {appt.status}"

    if appt.scheduled_at is None:
        return False, "Appointment has no scheduled time"

    if settings.meeting_skip_join_window_check:
        return True, ""

    now = datetime.now(timezone.utc)
    # Normalize to aware UTC (scheduled_at has tz=True in the model)
    scheduled = appt.scheduled_at
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)

    earliest = scheduled - timedelta(minutes=settings.meeting_join_window_before_minutes)
    latest = scheduled + timedelta(minutes=settings.meeting_join_window_after_minutes)

    if now < earliest:
        return False, f"Meeting opens at {earliest.isoformat()}"
    if now > latest:
        return False, "Meeting window has closed"

    return True, ""


@router.websocket("/ws/meet/{appointment_id}")
async def signaling_endpoint(websocket: WebSocket, appointment_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    actor = get_actor_from_token(token)
    if not actor:
        await websocket.close(code=1008, reason="Invalid token")
        return

    db = SessionLocal()
    try:
        appt = db.scalar(select(Appointment).where(Appointment.id == appointment_id))
        if not appt:
            await websocket.close(code=1008, reason="Appointment not found")
            return

        is_doctor = actor.role == "doctor" and str(appt.doctor_id) == actor.doctor_id
        is_patient = actor.role == "patient" and str(appt.patient_id) == actor.patient_id
        is_admin = actor.role == "admin"

        if not (is_doctor or is_patient or is_admin):
            await websocket.close(code=1008, reason="Not authorized for this appointment")
            return

        ok, reason = _check_appointment_joinable(appt, actor.role)
        if not ok:
            await websocket.close(code=1008, reason=reason)
            return
    finally:
        db.close()

    role = actor.role
    if not await manager.connect(websocket, appointment_id, role):
        return

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type in ("offer", "answer", "ice-candidate"):
                data["from_role"] = role
                await manager.relay_signaling(websocket, appointment_id, data)

            elif msg_type == "chat":
                text = data.get("text")
                image_url = data.get("imageUrl")
                saved = save_chat_message(appointment_id, role, text, image_url)
                await manager.broadcast(appointment_id, {
                    "type": "chat",
                    "from_role": role,
                    "text": text,
                    "imageUrl": image_url,
                    "message": saved,
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(websocket, appointment_id)
    except Exception:
        await manager.disconnect(websocket, appointment_id)


@router.get("/turn-credentials", dependencies=[Depends(rate_limit)])
def get_turn_credentials(actor: Actor = Depends(get_actor)):
    """Return TURN credentials for the authenticated client.

    Two modes (selected via `TURN_MODE` env var):

    - "hmac":  Self-hosted coturn with `--use-auth-secret`. We mint a
      time-limited username `<unix-expiry>:<sub>:<random>` and compute
      `base64(HMAC-SHA1(TURN_SECRET, username))` as the password.
    - "static": External TURN provider (e.g. Metered OpenRelay). We return
      the fixed credentials configured in env verbatim.
    """
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")

    mode = (settings.turn_mode or "hmac").lower()

    if mode == "static":
        uris = [u.strip() for u in settings.turn_static_uris.split(",") if u.strip()]
        if not (settings.turn_static_username and settings.turn_static_password and uris):
            raise HTTPException(
                status_code=500,
                detail="TURN static credentials are not configured on the server",
            )
        return {
            "username": settings.turn_static_username,
            "password": settings.turn_static_password,
            "ttl": settings.turn_ttl_seconds,
            "uris": uris,
            "realm": settings.turn_realm,
        }

    # Default: HMAC mode (self-hosted coturn)
    ttl = settings.turn_ttl_seconds
    expiry = int(time.time()) + ttl
    user_tag = (actor.sub or "anon")[:32]
    username = f"{expiry}:{user_tag}:{secrets.token_hex(4)}"

    password = base64.b64encode(
        hmac.new(_turn_secret().encode(), username.encode(), hashlib.sha1).digest()
    ).decode()

    host = settings.turn_host
    port = settings.turn_port
    tls_port = settings.turn_tls_port

    uris: list[str] = [
        f"turn:{host}:{port}?transport=udp",
        f"turn:{host}:{port}?transport=tcp",
    ]
    if settings.turn_tls_enabled:
        uris.append(f"turns:{host}:{tls_port}?transport=tcp")

    return {
        "username": username,
        "password": password,
        "ttl": ttl,
        "uris": uris,
        "realm": settings.turn_realm,
    }
