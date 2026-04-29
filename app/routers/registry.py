"""
Public doctor registry — unauthenticated, read-only.
Mounted at /registry
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Doctor
from app.schemas import DoctorDetail, DoctorListItem, DoctorsPage
from app.deps import rate_limit

router = APIRouter(dependencies=[Depends(rate_limit)], tags=["registry"])


@router.get("/doctors", response_model=DoctorsPage)
def list_doctors(
    q: str | None = Query(default=None, max_length=200),
    specialty: str | None = Query(default=None, max_length=200),
    language: str | None = Query(default=None, max_length=100),
    country: str | None = Query(default=None, max_length=100),
    sort: str | None = Query(default="name", pattern="^(name|years_experience|avg_response_minutes)$"),
    page: int = Query(default=1, ge=1, le=500),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Doctor).filter(Doctor.slug.isnot(None))

    if q:
        term = f"%{q.lower()}%"
        query = query.filter(
            or_(
                func.lower(Doctor.name).like(term),
                func.lower(Doctor.specialty).like(term),
                func.lower(Doctor.bio).like(term),
                func.lower(Doctor.hospital).like(term),
            )
        )
    if specialty:
        query = query.filter(func.lower(Doctor.specialty) == specialty.lower())
    if language:
        query = query.filter(Doctor.languages.any(func.lower(language)))
    if country:
        query = query.filter(func.lower(Doctor.country) == country.lower())

    sort_col = {
        "name": Doctor.name,
        "years_experience": Doctor.years_experience.desc(),
        "avg_response_minutes": Doctor.avg_response_minutes,
    }.get(sort or "name", Doctor.name)
    query = query.order_by(sort_col)

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return DoctorsPage(total=total, items=items)


@router.get("/doctors/{slug}", response_model=DoctorDetail)
def get_doctor(slug: str, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.slug == slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor
