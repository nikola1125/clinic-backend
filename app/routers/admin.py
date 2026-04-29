from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from datetime import datetime

from app.db.session import db_session
from app.deps import require_admin, rate_limit
from app.db.models import Doctor, Consult, Appointment, Patient, User
from app.schemas import DoctorCreate, DoctorOut, ConsultCreate, ConsultOut, RevenueResponse, PatientOut, AppointmentOut
from app.core.security import hash_password

router = APIRouter(dependencies=[Depends(rate_limit)])


def _set_admin_rls(db):
    db.execute(text("select set_config('app.is_admin','true', true)"))


@router.get("/doct", response_model=list[DoctorOut])
def list_doctors(_=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        docs = db.query(Doctor).all()
        
        # Populating username field for each doctor
        res = []
        for d in docs:
            dout = DoctorOut(
                id=d.id,
                email=d.email,
                name=d.name,
                specialty=d.specialty,
                bio=d.bio,
                username=d.user.username if d.user else None
            )
            res.append(dout)
        return res




@router.post("/doctors", response_model=DoctorOut)
def create_doctor(payload: DoctorCreate, _=Depends(require_admin)):
    with db_session() as db_ctx:
        _set_admin_rls(db_ctx)
        d = Doctor(email=payload.email, name=payload.name, specialty=payload.specialty, bio=payload.bio)
        db_ctx.add(d)
        db_ctx.flush()
        
        # Create User account with custom credentials
        u = User(
            email=payload.email,
            username=payload.username,
            hashed_pw=hash_password(payload.password or "doctor123"),
            role="doctor",
            doctor_id=d.id
        )
        db_ctx.add(u)
        
        db_ctx.commit()
        db_ctx.refresh(d)
        
        # Prepare response which includes username
        out = DoctorOut(
            id=d.id,
            email=d.email,
            name=d.name,
            specialty=d.specialty,
            bio=d.bio,
            username=payload.username
        )
        return out


@router.post("/doctors/{doctor_id}/consults", response_model=ConsultOut)
def create_consult(doctor_id: str, payload: ConsultCreate, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        d = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Doctor not found")
        c = Consult(doctor_id=d.id, title=payload.title, price_cents=payload.price_cents)
        db.add(c)
        db.commit()
        db.refresh(c)
        return c


@router.get("/doctors/{doctor_id}/consults", response_model=list[ConsultOut])
def list_consults(doctor_id: str, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        return db.query(Consult).filter(Consult.doctor_id == doctor_id).all()


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: str, payload: DoctorCreate, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        d = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Doctor not found")
        d.email = payload.email
        d.name = payload.name
        d.specialty = payload.specialty
        d.bio = payload.bio
        db.add(d)
        
        # Update User part
        u = d.user
        if u:
            u.email = payload.email
            u.username = payload.username
            if payload.password:
                u.hashed_pw = hash_password(payload.password)
            db.add(u)
        
        db.commit()
        db.refresh(d)
        
        return DoctorOut(
            id=d.id,
            email=d.email,
            name=d.name,
            specialty=d.specialty,
            bio=d.bio,
            username=payload.username
        )


@router.delete("/doctors/{doctor_id}", status_code=204)
def delete_doctor(doctor_id: str, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        d = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Doctor not found")
        db.delete(d)
        db.commit()


@router.put("/consults/{consult_id}", response_model=ConsultOut)
def update_consult(consult_id: str, payload: ConsultCreate, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        c = db.query(Consult).filter(Consult.id == consult_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Consult not found")
        c.title = payload.title
        c.price_cents = payload.price_cents
        db.add(c)
        db.commit()
        db.refresh(c)
        return c


@router.delete("/consults/{consult_id}", status_code=204)
def delete_consult(consult_id: str, _=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        c = db.query(Consult).filter(Consult.id == consult_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Consult not found")
        db.delete(c)
        db.commit()


@router.get("/revenue", response_model=RevenueResponse)
def revenue(
    year: int | None = None, 
    month: int | None = None, 
    day: int | None = None,
    doctor_id: str | None = None, 
    _=Depends(require_admin)
):
    with db_session() as db:
        _set_admin_rls(db)
        q = db.query(Appointment).filter(Appointment.status == "completed")
        if year:
            q = q.filter(text("extract(year from scheduled_at) = :year")).params(year=year)
        if month:
            q = q.filter(text("extract(month from scheduled_at) = :month")).params(month=month)
        if day:
            q = q.filter(text("extract(day from scheduled_at) = :day")).params(day=day)
        if doctor_id:
            q = q.filter(Appointment.doctor_id == doctor_id)
        
        total_cents = sum(a.price_cents or 0 for a in q.all())
        total_usd = total_cents / 100.0
        return {
            "total_usd": total_usd, 
            "year": year, 
            "month": month, 
            "day": day,
            "doctor_id": doctor_id
        }

@router.get("/patients", response_model=list[PatientOut])
def list_patients(_=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        return db.query(Patient).all()

@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(_=Depends(require_admin)):
    with db_session() as db:
        _set_admin_rls(db)
        return db.query(Appointment).all()
