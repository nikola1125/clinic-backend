"""
Application endpoints — doctor recruitment and partner onboarding.
Mounted at /api/applications
"""

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from app.db.session import db_session
from app.db.models import DoctorApplication, PartnerApplication
from app.schemas import (
    DoctorApplicationCreate,
    DoctorApplicationOut,
    PartnerApplicationCreate,
    PartnerApplicationOut,
)

router = APIRouter(tags=["applications"])


def _reference(obj_id: str) -> str:
    """Human-readable reference: first 8 chars of UUID uppercased."""
    return str(obj_id).upper().replace("-", "")[:8]


def _bypass(db):
    db.execute(text("select set_config('app.is_admin','true', true)"))


# ── Doctor application ────────────────────────────────────────────────────

@router.post("/doctor", response_model=DoctorApplicationOut, status_code=201)
def apply_as_doctor(payload: DoctorApplicationCreate, request: Request):
    with db_session() as db:
        _bypass(db)
        app = DoctorApplication(
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            country_of_practice=payload.country_of_practice,
            license_number=payload.license_number,
            license_authority=payload.license_authority,
            specialty=payload.specialty,
            years_experience=payload.years_experience,
            languages=payload.languages,
            hospital_affiliation=payload.hospital_affiliation,
            essay=payload.essay,
            availability=payload.availability,
            cv_url=payload.cv_url,
            status="pending",
        )
        db.add(app)
        db.commit()
        db.refresh(app)

    return DoctorApplicationOut(
        id=app.id,
        created_at=app.created_at,
        full_name=app.full_name,
        email=app.email,
        specialty=app.specialty,
        status=app.status,
        reference=_reference(str(app.id)),
    )


# ── Partner application ───────────────────────────────────────────────────

@router.post("/partner", response_model=PartnerApplicationOut, status_code=201)
def apply_as_partner(payload: PartnerApplicationCreate, request: Request):
    with db_session() as db:
        _bypass(db)
        app = PartnerApplication(
            business_name=payload.business_name,
            nipt=payload.nipt,
            partner_type=payload.partner_type,
            city=payload.city,
            address=payload.address,
            contact_name=payload.contact_name,
            email=payload.email,
            phone=payload.phone,
            services=payload.services,
            coverage_area=payload.coverage_area,
            expected_volume=payload.expected_volume,
            notes=payload.notes,
            status="pending",
        )
        db.add(app)
        db.commit()
        db.refresh(app)

    return PartnerApplicationOut(
        id=app.id,
        created_at=app.created_at,
        business_name=app.business_name,
        partner_type=app.partner_type,
        status=app.status,
        reference=_reference(str(app.id)),
    )
