from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.db.session import db_session
from app.deps import require_patient, rate_limit
from app.db.models import Doctor, Patient, Appointment, Consult
from app.schemas import (
    PatientCreate,
    PatientOut,
    AppointmentCreate,
    AppointmentOut,
)
from app.core.security import Actor

router = APIRouter(dependencies=[Depends(rate_limit)])


def _set_public_rls_bypass(db):
    db.execute(text("select set_config('app.is_admin','true', true)"))


@router.get("/doctors")
def list_doctors():
    """Public doctor listing — returns only non-sensitive fields."""
    with db_session() as db:
        _set_public_rls_bypass(db)
        doctors = db.query(Doctor).all()
        return [
            {
                "id": str(d.id),
                "name": d.name,
                "specialty": d.specialty,
                "bio": d.bio,
                # email intentionally omitted from public response
            }
            for d in doctors
        ]


@router.get("/doctors/{doctor_id}/consults")
def list_consults(doctor_id: str):
    with db_session() as db:
        _set_public_rls_bypass(db)
        return db.query(Consult).filter(Consult.doctor_id == doctor_id).all()


@router.post("/appointments", response_model=AppointmentOut)
def book_appointment(payload: AppointmentCreate, actor: Actor = Depends(require_patient)):
    """Book an appointment — patient must be authenticated."""
    with db_session() as db:
        _set_public_rls_bypass(db)

        # Patient can only book for themselves
        if str(payload.patient_id) != str(actor.patient_id):
            raise HTTPException(status_code=403, detail="Cannot book appointment for another patient")

        consult = db.query(Consult).filter(Consult.id == payload.consult_id).first()
        if not consult:
            raise HTTPException(status_code=404, detail="Consult not found")

        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        appt = Appointment(
            doctor_id=payload.doctor_id,
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


@router.post("/patients", response_model=PatientOut)
def create_patient(payload: PatientCreate, actor: Actor = Depends(require_patient)):
    """Create patient profile — patient must be authenticated."""
    with db_session() as db:
        _set_public_rls_bypass(db)

        if payload.doctor_id:
            doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")

        patient = Patient(
            doctor_id=payload.doctor_id,
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient


@router.get("/patient/me", response_model=list[PatientOut])
def get_my_patient_profile(actor: Actor = Depends(require_patient)):
    with db_session() as db:
        _set_public_rls_bypass(db)
        return db.query(Patient).filter(Patient.id == actor.patient_id).all()


@router.get("/patient/appointments", response_model=list[AppointmentOut])
def get_my_appointments(actor: Actor = Depends(require_patient)):
    with db_session() as db:
        _set_public_rls_bypass(db)
        return (
            db.query(Appointment)
            .filter(Appointment.patient_id == actor.patient_id)
            .order_by(Appointment.scheduled_at.asc())
            .all()
        )
