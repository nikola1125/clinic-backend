from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.db.session import db_session
from app.db.models import ContactMessage

router = APIRouter()


class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    subject: str = "General enquiry"
    message: str


@router.post("/contact", status_code=201)
def submit_contact_message(body: ContactMessageCreate):
    """Public endpoint — stores contact form submissions."""
    if not body.name.strip() or not body.message.strip():
        raise HTTPException(status_code=422, detail="Name and message are required.")

    with db_session() as db:
        msg = ContactMessage(
            name=body.name.strip()[:256],
            email=body.email,
            subject=body.subject.strip()[:256] if body.subject else "General enquiry",
            message=body.message.strip()[:4096],
        )
        db.add(msg)
        db.commit()

    return {"ok": True}
