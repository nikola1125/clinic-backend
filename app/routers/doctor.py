from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from datetime import datetime, timezone

from app.db.session import db_session
from app.deps import require_doctor, rate_limit
from app.db.models import (
    Patient, Appointment, Consult, ChatMessage,
    MedicalProfile, MedicalNote, Prescription, ActiveMedication,
    Diagnosis, PatientDocument, DoctorAvailability, Meeting, DoctorPatientLink,
)
from app.schemas import (
    PatientOut, AppointmentOut, SetStatus,
    AppointmentCreate, ChatMessageCreate, ChatMessageOut,
    MedicalProfileUpdate, MedicalProfileOut,
    MedicalNoteCreate, MedicalNoteUpdate, MedicalNoteOut,
    PrescriptionCreate, PrescriptionOut, PrescriptionStatusUpdate,
    ActiveMedicationCreate, ActiveMedicationOut, MedicationStatusUpdate,
    DiagnosisCreate, DiagnosisOut,
    PatientDocumentCreate, PatientDocumentOut,
    AvailabilitySlot, AvailabilityOut,
    MeetingOut,
)

router = APIRouter(dependencies=[Depends(rate_limit)])


def _set_doctor_rls(db, doctor_id: str):
    db.execute(text("select set_config('app.is_admin','false', true)"))
    db.execute(text("select set_config('app.current_doctor_id', :id, true)"), {"id": doctor_id})


def _get_patient_or_404(db, patient_id: str, doctor_id: str) -> Patient:
    """Return the patient if the doctor owns them directly (old FK) or via DoctorPatientLink."""
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Primary ownership (old FK still in place during migration)
    if str(p.doctor_id) == doctor_id:
        return p
    # Multi-doctor link
    link = db.query(DoctorPatientLink).filter(
        DoctorPatientLink.doctor_id == doctor_id,
        DoctorPatientLink.patient_id == patient_id,
        DoctorPatientLink.status == "active",
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


# ── Existing endpoints ────────────────────────────────────────────────────────

@router.get("/patients", response_model=list[PatientOut])
def list_patients(actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        # Primary patients (old FK)
        primary_ids = {
            str(r.id)
            for r in db.query(Patient.id).filter(Patient.doctor_id == actor.doctor_id).all()
        }
        # Additional patients via DoctorPatientLink
        linked_ids = {
            str(r.patient_id)
            for r in db.query(DoctorPatientLink.patient_id).filter(
                DoctorPatientLink.doctor_id == actor.doctor_id,
                DoctorPatientLink.status == "active",
            ).all()
        }
        # Patients who have appointments with this doctor
        appt_patient_ids = {
            str(r.patient_id)
            for r in db.query(Appointment.patient_id).filter(
                Appointment.doctor_id == actor.doctor_id
            ).all()
        }
        all_ids = primary_ids | linked_ids | appt_patient_ids
        if not all_ids:
            return []
        from sqlalchemy import or_
        return db.query(Patient).filter(
            Patient.id.in_(all_ids)
        ).order_by(Patient.full_name).all()


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
        if payload.status == "accepted":
            existing = db.query(Meeting).filter(Meeting.appointment_id == appointment_id).first()
            if not existing:
                db.add(Meeting(appointment_id=a.id))
        db.add(a)
        db.commit()
        db.refresh(a)
        return a


@router.get("/consults", response_model=list[dict])
def my_consults(actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        cs = db.query(Consult).filter(Consult.doctor_id == actor.doctor_id).all()
        return [{"id": str(c.id), "title": c.title, "price_cents": c.price_cents} for c in cs]


@router.post("/appointments", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        consult = db.query(Consult).filter(Consult.id == payload.consult_id).first()
        if not consult or str(consult.doctor_id) != actor.doctor_id:
            raise HTTPException(status_code=404, detail="Consult not found")
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
        return db.query(ChatMessage).filter(ChatMessage.appointment_id == appointment_id).order_by(ChatMessage.created_at.asc()).all()


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


# ── Medical Profile ───────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/medical-profile", response_model=MedicalProfileOut)
def get_medical_profile(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        profile = db.query(MedicalProfile).filter(MedicalProfile.patient_id == patient_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Medical profile not found")
        return profile


@router.put("/patients/{patient_id}/medical-profile", response_model=MedicalProfileOut)
def upsert_medical_profile(patient_id: str, payload: MedicalProfileUpdate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        profile = db.query(MedicalProfile).filter(MedicalProfile.patient_id == patient_id).first()
        if not profile:
            profile = MedicalProfile(patient_id=patient_id)
            db.add(profile)
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(profile, field, value)
        profile.updated_by_doctor_id = actor.doctor_id
        db.commit()
        db.refresh(profile)
        return profile


# ── Medical Notes ─────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/notes", response_model=list[MedicalNoteOut])
def list_notes(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        return db.query(MedicalNote).filter(MedicalNote.patient_id == patient_id).order_by(MedicalNote.created_at.desc()).all()


@router.post("/patients/{patient_id}/notes", response_model=MedicalNoteOut)
def create_note(patient_id: str, payload: MedicalNoteCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        note = MedicalNote(
            patient_id=patient_id,
            doctor_id=actor.doctor_id,
            appointment_id=str(payload.appointment_id) if payload.appointment_id else None,
            category=payload.category,
            content=payload.content,
            is_private=payload.is_private,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note


@router.patch("/patients/{patient_id}/notes/{note_id}", response_model=MedicalNoteOut)
def update_note(patient_id: str, note_id: str, payload: MedicalNoteUpdate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        note = db.query(MedicalNote).filter(MedicalNote.id == note_id, MedicalNote.patient_id == patient_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(note, field, value)
        db.commit()
        db.refresh(note)
        return note


@router.delete("/patients/{patient_id}/notes/{note_id}", status_code=204)
def delete_note(patient_id: str, note_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        note = db.query(MedicalNote).filter(MedicalNote.id == note_id, MedicalNote.patient_id == patient_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        db.delete(note)
        db.commit()


# ── Prescriptions ─────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        return db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.issued_at.desc()).all()


@router.post("/patients/{patient_id}/prescriptions", response_model=PrescriptionOut)
def create_prescription(patient_id: str, payload: PrescriptionCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        rx = Prescription(
            patient_id=patient_id,
            doctor_id=actor.doctor_id,
            appointment_id=str(payload.appointment_id) if payload.appointment_id else None,
            medication_name=payload.medication_name,
            dosage=payload.dosage,
            frequency=payload.frequency,
            duration_days=payload.duration_days,
            refills_remaining=payload.refills_remaining,
            instructions=payload.instructions,
            expires_at=payload.expires_at,
        )
        db.add(rx)
        db.commit()
        db.refresh(rx)
        return rx


@router.patch("/patients/{patient_id}/prescriptions/{rx_id}/status", response_model=PrescriptionOut)
def update_prescription_status(patient_id: str, rx_id: str, payload: PrescriptionStatusUpdate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        rx = db.query(Prescription).filter(Prescription.id == rx_id, Prescription.patient_id == patient_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        rx.status = payload.status
        db.commit()
        db.refresh(rx)
        return rx


# ── Active Medications ────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/medications", response_model=list[ActiveMedicationOut])
def list_medications(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        return db.query(ActiveMedication).filter(ActiveMedication.patient_id == patient_id).order_by(ActiveMedication.started_at.desc()).all()


@router.post("/patients/{patient_id}/medications", response_model=ActiveMedicationOut)
def create_medication(patient_id: str, payload: ActiveMedicationCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        med = ActiveMedication(
            patient_id=patient_id,
            doctor_id=actor.doctor_id,
            name=payload.name,
            dosage=payload.dosage,
            frequency=payload.frequency,
            started_at=payload.started_at,
            ends_at=payload.ends_at,
            notes=payload.notes,
        )
        db.add(med)
        db.commit()
        db.refresh(med)
        return med


@router.patch("/patients/{patient_id}/medications/{med_id}/status", response_model=ActiveMedicationOut)
def update_medication_status(patient_id: str, med_id: str, payload: MedicationStatusUpdate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        med = db.query(ActiveMedication).filter(ActiveMedication.id == med_id, ActiveMedication.patient_id == patient_id).first()
        if not med:
            raise HTTPException(status_code=404, detail="Medication not found")
        med.status = payload.status
        db.commit()
        db.refresh(med)
        return med


# ── Diagnoses ─────────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/diagnoses", response_model=list[DiagnosisOut])
def list_diagnoses(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        return db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).order_by(Diagnosis.diagnosed_at.desc()).all()


@router.post("/patients/{patient_id}/diagnoses", response_model=DiagnosisOut)
def create_diagnosis(patient_id: str, payload: DiagnosisCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        now = datetime.now(timezone.utc)
        dx = Diagnosis(
            patient_id=patient_id,
            doctor_id=actor.doctor_id,
            appointment_id=str(payload.appointment_id) if payload.appointment_id else None,
            icd_code=payload.icd_code,
            description=payload.description,
            severity=payload.severity,
            status=payload.status,
            diagnosed_at=payload.diagnosed_at or now,
        )
        db.add(dx)
        db.commit()
        db.refresh(dx)
        return dx


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/documents", response_model=list[PatientDocumentOut])
def list_documents(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        return db.query(PatientDocument).filter(PatientDocument.patient_id == patient_id).order_by(PatientDocument.uploaded_at.desc()).all()


@router.post("/patients/{patient_id}/documents", response_model=PatientDocumentOut)
def create_document(patient_id: str, payload: PatientDocumentCreate, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        doc = PatientDocument(
            patient_id=patient_id,
            doctor_id=actor.doctor_id,
            title=payload.title,
            file_url=payload.file_url,
            file_type=payload.file_type,
            category=payload.category,
            uploaded_by="doctor",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc


# ── Timeline ──────────────────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/timeline")
def get_timeline(patient_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        _set_doctor_rls(db, actor.doctor_id)
        _get_patient_or_404(db, patient_id, actor.doctor_id)
        items: list[dict] = []

        for n in db.query(MedicalNote).filter(MedicalNote.patient_id == patient_id).all():
            items.append({"type": "note", "date": n.created_at.isoformat(), "data": MedicalNoteOut.model_validate(n).model_dump()})
        for rx in db.query(Prescription).filter(Prescription.patient_id == patient_id).all():
            items.append({"type": "prescription", "date": rx.issued_at.isoformat(), "data": PrescriptionOut.model_validate(rx).model_dump()})
        for med in db.query(ActiveMedication).filter(ActiveMedication.patient_id == patient_id).all():
            items.append({"type": "medication", "date": med.started_at.isoformat(), "data": ActiveMedicationOut.model_validate(med).model_dump()})
        for dx in db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).all():
            items.append({"type": "diagnosis", "date": dx.diagnosed_at.isoformat(), "data": DiagnosisOut.model_validate(dx).model_dump()})
        for doc in db.query(PatientDocument).filter(PatientDocument.patient_id == patient_id).all():
            items.append({"type": "document", "date": doc.uploaded_at.isoformat(), "data": PatientDocumentOut.model_validate(doc).model_dump()})

        items.sort(key=lambda x: x["date"], reverse=True)
        return items


# ── Availability ──────────────────────────────────────────────────────────────

@router.get("/availability", response_model=list[AvailabilityOut])
def get_availability(actor=Depends(require_doctor)):
    with db_session() as db:
        return db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id == actor.doctor_id).order_by(DoctorAvailability.day_of_week).all()


@router.put("/availability", response_model=list[AvailabilityOut])
def upsert_availability(slots: list[AvailabilitySlot], actor=Depends(require_doctor)):
    with db_session() as db:
        db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id == actor.doctor_id).delete()
        new_slots = []
        for s in slots:
            slot = DoctorAvailability(
                doctor_id=actor.doctor_id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                slot_duration_min=s.slot_duration_min,
                is_active=s.is_active,
            )
            db.add(slot)
            new_slots.append(slot)
        db.commit()
        for s in new_slots:
            db.refresh(s)
        return new_slots


# ── Meetings ──────────────────────────────────────────────────────────────────

@router.post("/meetings/{appointment_id}/start", response_model=MeetingOut)
def start_meeting(appointment_id: str, actor=Depends(require_doctor)):
    with db_session() as db:
        appt = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == actor.doctor_id,
        ).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        meeting = db.query(Meeting).filter(Meeting.appointment_id == appointment_id).first()
        if not meeting:
            meeting = Meeting(appointment_id=appointment_id)
            db.add(meeting)
        meeting.status = "active"
        meeting.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(meeting)
        return meeting


# NOTE: Meeting end is handled by POST /meet/{appointment_id}/end in websocket.py
# (works for both doctor and patient). The duplicate endpoint was removed.


# ── Doctor-Patient links (multi-doctor support) ────────────────────────────────

@router.post("/patients/{patient_id}/link", response_model=PatientOut)
def link_patient(patient_id: str, actor=Depends(require_doctor)):
    """Add an existing patient to this doctor's caseload via DoctorPatientLink."""
    with db_session() as db:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found")
        existing = db.query(DoctorPatientLink).filter(
            DoctorPatientLink.doctor_id == actor.doctor_id,
            DoctorPatientLink.patient_id == patient_id,
        ).first()
        if existing:
            existing.status = "active"
        else:
            db.add(DoctorPatientLink(
                doctor_id=actor.doctor_id,
                patient_id=patient_id,
                is_primary=False,
                status="active",
            ))
        db.commit()
        db.refresh(p)
        return p


@router.delete("/patients/{patient_id}/link", status_code=204)
def unlink_patient(patient_id: str, actor=Depends(require_doctor)):
    """Remove a DoctorPatientLink (does not delete the patient)."""
    with db_session() as db:
        link = db.query(DoctorPatientLink).filter(
            DoctorPatientLink.doctor_id == actor.doctor_id,
            DoctorPatientLink.patient_id == patient_id,
        ).first()
        if link:
            link.status = "inactive"
            db.commit()
