from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from datetime import datetime

from app.db.session import db_session
from app.deps import require_doctor, rate_limit
from app.db.models import Patient, Appointment, Consult, ChatMessage
from app.schemas import (
    PatientOut,
    PatientEntry,
    AppointmentOut,
    SetStatus,
    AppointmentCreate,
    ChatMessageCreate,
    ChatMessageOut,
)

router = APIRouter(dependencies=[Depends(rate_limit)])


def _set_doctor_rls(db, doctor_id: str):
    db.execute(text("select set_config('app.is_admin','false', true)"))
    db.execute(text("select set_config('app.current_doctor_id', :id, true)"), {"id": doctor_id})


@router.get("/patients", response_model=list[PatientOut])
def list_patients(actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        return db.query(Patient).all()


@router.post("/patients/{patient_id}/entries", response_model=PatientOut)
def add_patient_entry(patient_id: str, payload: PatientEntry, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found")

        arr = getattr(p, payload.kind)
        setattr(p, payload.kind, [*arr, payload.value])
        db.add(p)
        db.commit()
        db.refresh(p)
        return p


@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        return db.query(Appointment).order_by(Appointment.scheduled_at.asc()).all()


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentOut)
def set_status(appointment_id: str, payload: SetStatus, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Appointment not found")
        a.status = payload.status
        db.add(a)
        db.commit()
        db.refresh(a)
        return a


@router.get("/consults", response_model=list[dict])
def my_consults(actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        cs = db.query(Consult).filter(Consult.doctor_id == actor.doctor_id).all()
        return [
            {"id": str(c.id), "title": c.title, "price_cents": c.price_cents}
            for c in cs
        ]


@router.post("/appointments", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        # Ensure consult exists and belongs to this doctor
        consult = db.query(Consult).filter(Consult.id == payload.consult_id).first()
        if not consult or str(consult.doctor_id) != actor.doctor_id:
            raise HTTPException(status_code=404, detail="Consult not found")
        # Ensure patient exists and belongs to this doctor
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if not patient or str(patient.doctor_id) != actor.doctor_id:
            raise HTTPException(status_code=404, detail="Patient not found")
        appt = Appointment(
            doctor_id=actor.doctor_id,
            patient_id=payload.patient_id,
            consult_id=payload.consult_id,
            scheduled_at=payload.scheduled_at,
            status="pending",
            price_cents=consult.price_cents,
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return appt


@router.get("/appointments/{appointment_id}/chat", response_model=list[ChatMessageOut])
def get_chat(appointment_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        msgs = db.query(ChatMessage).filter(ChatMessage.appointment_id == appointment_id).order_by(ChatMessage.created_at.asc()).all()
        return msgs


@router.post("/appointments/{appointment_id}/chat", response_model=ChatMessageOut)
def send_chat(appointment_id: str, payload: ChatMessageCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        msg = ChatMessage(
            appointment_id=appointment_id,
            sender="doctor",
            message=payload.message,
            image_url=payload.image_url,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
