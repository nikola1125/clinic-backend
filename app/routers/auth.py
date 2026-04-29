from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Patient, Doctor
from app.core.security import hash_password, verify_password, create_access_token, Actor
from app.deps import get_actor, require_admin, rate_limit

router = APIRouter(tags=["auth"], dependencies=[Depends(rate_limit)])


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class RegisterRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(max_length=200)
    doctor_id: str | None = None
    phone: str | None = Field(default=None, max_length=30)


class CreateStaffRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    role: str  # "doctor" or "admin"
    doctor_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    doctor_id: str | None = None
    patient_id: str | None = None


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == req.email) | (User.username == req.email)
    ).first()

    # Constant-time: always run verify_password to prevent timing attacks
    stored_hash = user.hashed_pw if user else "$2b$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXX"
    password_ok = verify_password(req.password, stored_hash)

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    token = create_access_token(
        sub=str(user.id),
        role=user.role,
        doctor_id=str(user.doctor_id) if user.doctor_id else None,
        patient_id=str(user.patient_id) if user.patient_id else None,
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        doctor_id=str(user.doctor_id) if user.doctor_id else None,
        patient_id=str(user.patient_id) if user.patient_id else None,
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == req.email)):
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.doctor_id:
        doctor = db.scalar(select(Doctor).where(Doctor.id == req.doctor_id))
        if not doctor:
            raise HTTPException(status_code=404, detail="Selected doctor not found")

    new_patient = Patient(
        doctor_id=req.doctor_id,
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
    )
    db.add(new_patient)
    db.flush()

    new_user = User(
        email=req.email,
        hashed_pw=hash_password(req.password),
        role="patient",
        patient_id=new_patient.id,
    )
    db.add(new_user)
    db.commit()

    token = create_access_token(
        sub=str(new_user.id),
        role="patient",
        patient_id=str(new_patient.id),
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role="patient",
        patient_id=str(new_patient.id),
    )


@router.post("/create-staff")
def create_staff(
    req: CreateStaffRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),  # require_admin raises 401/403 on its own
):
    if req.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'doctor'")

    if db.scalar(select(User).where(User.email == req.email)):
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=req.email,
        hashed_pw=hash_password(req.password),
        role=req.role,
        doctor_id=req.doctor_id if req.role == "doctor" else None,
    )
    db.add(new_user)
    db.commit()
    return {"message": "Staff account created successfully"}


@router.get("/me")
def get_me(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    if not actor:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db.scalar(select(User).where(User.id == actor.sub))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "doctor_id": str(user.doctor_id) if user.doctor_id else None,
        "patient_id": str(user.patient_id) if user.patient_id else None,
    }
