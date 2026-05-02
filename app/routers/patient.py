from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from app.db.session import db_session
from app.deps import require_patient, rate_limit
from app.db.models import (
    Patient, Appointment, ChatMessage,
    MedicalProfile, MedicalNote, Prescription, ActiveMedication,
    Diagnosis, PatientDocument, Notification,
)
from app.schemas import (
    PatientMe, AppointmentOut, ChatMessageCreate, ChatMessageOut,
    MedicalProfileOut, MedicalNoteOut, PrescriptionOut,
    ActiveMedicationOut, DiagnosisOut,
    PatientDocumentCreate, PatientDocumentOut,
    NotificationOut,
)

router = APIRouter(dependencies=[Depends(rate_limit)])


def _get_my_patient(db, patient_id: str) -> Patient:
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return p


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=PatientMe)
def get_me(actor=Depends(require_patient)):
    with db_session() as db:
        return _get_my_patient(db, actor.patient_id)


# ── Medical Profile ───────────────────────────────────────────────────────────

@router.get("/medical-profile", response_model=MedicalProfileOut)
def get_medical_profile(actor=Depends(require_patient)):
    with db_session() as db:
        profile = db.query(MedicalProfile).filter(MedicalProfile.patient_id == actor.patient_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Medical profile not found")
        return profile


# ── Notes (non-private only) ──────────────────────────────────────────────────

@router.get("/notes", response_model=list[MedicalNoteOut])
def get_notes(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(MedicalNote)
            .filter(MedicalNote.patient_id == actor.patient_id, MedicalNote.is_private == False)
            .order_by(MedicalNote.created_at.desc())
            .all()
        )


# ── Prescriptions ─────────────────────────────────────────────────────────────

@router.get("/prescriptions", response_model=list[PrescriptionOut])
def get_prescriptions(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(Prescription)
            .filter(Prescription.patient_id == actor.patient_id)
            .order_by(Prescription.issued_at.desc())
            .all()
        )


# ── Medications ───────────────────────────────────────────────────────────────

@router.get("/medications", response_model=list[ActiveMedicationOut])
def get_medications(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(ActiveMedication)
            .filter(ActiveMedication.patient_id == actor.patient_id)
            .order_by(ActiveMedication.started_at.desc())
            .all()
        )


# ── Diagnoses ─────────────────────────────────────────────────────────────────

@router.get("/diagnoses", response_model=list[DiagnosisOut])
def get_diagnoses(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(Diagnosis)
            .filter(Diagnosis.patient_id == actor.patient_id)
            .order_by(Diagnosis.diagnosed_at.desc())
            .all()
        )


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[PatientDocumentOut])
def get_documents(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(PatientDocument)
            .filter(PatientDocument.patient_id == actor.patient_id)
            .order_by(PatientDocument.uploaded_at.desc())
            .all()
        )


@router.post("/documents", response_model=PatientDocumentOut)
def upload_document(payload: PatientDocumentCreate, actor=Depends(require_patient)):
    with db_session() as db:
        doc = PatientDocument(
            patient_id=actor.patient_id,
            title=payload.title,
            file_url=payload.file_url,
            file_type=payload.file_type,
            category=payload.category,
            uploaded_by="patient",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc


# ── Appointments ──────────────────────────────────────────────────────────────

@router.get("/appointments", response_model=list[AppointmentOut])
def get_appointments(actor=Depends(require_patient)):
    with db_session() as db:
        return (
            db.query(Appointment)
            .filter(Appointment.patient_id == actor.patient_id)
            .order_by(Appointment.scheduled_at.asc())
            .all()
        )


@router.get("/appointments/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: str, actor=Depends(require_patient)):
    with db_session() as db:
        appt = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.patient_id == actor.patient_id,
        ).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appt


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.get("/appointments/{appointment_id}/chat", response_model=list[ChatMessageOut])
def get_chat(appointment_id: str, actor=Depends(require_patient)):
    with db_session() as db:
        appt = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.patient_id == actor.patient_id,
        ).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.appointment_id == appointment_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )


@router.post("/appointments/{appointment_id}/chat", response_model=ChatMessageOut)
def send_chat(appointment_id: str, payload: ChatMessageCreate, actor=Depends(require_patient)):
    with db_session() as db:
        appt = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.patient_id == actor.patient_id,
        ).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        msg = ChatMessage(
            appointment_id=appointment_id,
            sender="patient",
            message=payload.message,
            image_url=payload.image_url,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(actor=Depends(require_patient)):
    with db_session() as db:
        from app.db.models import User
        user = db.query(User).filter(User.patient_id == actor.patient_id).first()
        if not user:
            return []
        return (
            db.query(Notification)
            .filter(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .all()
        )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(notification_id: str, actor=Depends(require_patient)):
    with db_session() as db:
        from app.db.models import User
        user = db.query(User).filter(User.patient_id == actor.patient_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        ).first()
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")
        notif.read = True
        db.commit()
        db.refresh(notif)
        return notif
