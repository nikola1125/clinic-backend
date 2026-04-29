from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator


ALLOWED_IMAGE_HOSTS: list[str] = []  # e.g., ["cdn.yourdomain.com"] — add your CDN hosts here


class DoctorCreate(BaseModel):
    email: str = Field(max_length=254)
    name: str = Field(max_length=200)
    username: str | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    specialty: str = Field(default="", max_length=200)
    bio: str = Field(default="", max_length=2000)


class DoctorOut(BaseModel):
    id: UUID
    email: str
    name: str
    username: str | None
    specialty: str
    bio: str


class ConsultCreate(BaseModel):
    title: str = Field(max_length=300)
    price_cents: int = Field(ge=0, le=10_000_000)  # max $100,000


class ConsultOut(BaseModel):
    id: UUID
    doctor_id: UUID
    title: str
    price_cents: int


class PatientCreate(BaseModel):
    doctor_id: UUID | None = None
    full_name: str = Field(max_length=200)
    email: str = Field(max_length=254)
    phone: str | None = Field(default=None, max_length=30)


class PatientOut(BaseModel):
    id: UUID
    doctor_id: UUID | None
    full_name: str
    email: str
    phone: str | None
    notes: list[str]
    medicines: list[str]
    prescriptions: list[str]
    created_at: datetime


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    patient_id: UUID
    consult_id: UUID
    scheduled_at: datetime


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doctor_id: UUID
    patient_id: UUID
    consult_id: UUID
    scheduled_at: datetime
    status: Literal["pending", "accepted", "rejected", "completed"]
    price_cents: int


class MeetContextOut(BaseModel):
    """Who is calling (derived from JWT + appointment), plus display names."""

    role: Literal["doctor", "patient"]
    appointment: AppointmentOut
    doctor_name: str
    patient_full_name: str


class SetStatus(BaseModel):
    status: Literal["pending", "accepted", "rejected", "completed"]


class PatientEntry(BaseModel):
    kind: Literal["notes", "medicines", "prescriptions"]
    value: str = Field(max_length=2000)


class RevenueResponse(BaseModel):
    total_usd: float
    year: int | None = None
    month: int | None = None
    day: int | None = None
    doctor_id: UUID | None = None


class ChatMessageCreate(BaseModel):
    message: str = Field(max_length=5000)
    image_url: str | None = Field(default=None, max_length=2048)

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        # Must be a valid HTTPS URL
        if not v.startswith("https://"):
            raise ValueError("image_url must use HTTPS")
        # If ALLOWED_IMAGE_HOSTS is configured, enforce it
        if ALLOWED_IMAGE_HOSTS:
            from urllib.parse import urlparse
            host = urlparse(v).hostname or ""
            if not any(host == h or host.endswith(f".{h}") for h in ALLOWED_IMAGE_HOSTS):
                raise ValueError("image_url domain is not allowed")
        return v


class ChatMessageOut(BaseModel):
    id: UUID
    appointment_id: UUID
    sender: Literal["patient", "doctor"]
    message: str
    image_url: str | None
    created_at: datetime


# ── Registry schemas ────────────────────────────────────────────────────────

class TrainingItem(BaseModel):
    degree: str
    institution: str
    year: int


class PublicationItem(BaseModel):
    title: str
    journal: str
    year: int


class TestimonialItem(BaseModel):
    quote: str
    patient: str
    detail: str


class DoctorListItem(BaseModel):
    id: UUID
    slug: str
    name: str
    portrait_url: str | None
    specialty: str
    hospital: str
    country: str
    languages: list[str]
    license_authority: str
    years_experience: int
    avg_response_minutes: int
    bio: str

    model_config = {"from_attributes": True}


class DoctorDetail(DoctorListItem):
    license_number: str
    training: list[TrainingItem]
    affiliations: list[str]
    publications: list[PublicationItem]
    cases: list[str]
    testimonials: list[TestimonialItem]

    model_config = {"from_attributes": True}


class DoctorsPage(BaseModel):
    total: int
    items: list[DoctorListItem]


# ── Application schemas ──────────────────────────────────────────────────────

class DoctorApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: str = Field(max_length=254)
    phone: str | None = Field(default=None, max_length=30)
    country_of_practice: str = Field(min_length=2, max_length=100)
    license_number: str = Field(min_length=2, max_length=100)
    license_authority: str = Field(min_length=2, max_length=200)
    specialty: str = Field(min_length=2, max_length=100)
    years_experience: int = Field(ge=0, le=60)
    languages: list[str] = Field(default_factory=list, max_length=20)
    hospital_affiliation: str | None = Field(default=None, max_length=300)
    essay: str = Field(min_length=10, max_length=600)
    availability: dict = Field(default_factory=dict)
    cv_url: str | None = Field(default=None, max_length=2048)


class DoctorApplicationOut(BaseModel):
    id: UUID
    created_at: datetime
    full_name: str
    email: str
    specialty: str
    status: str
    reference: str

    model_config = {"from_attributes": True}


class PartnerApplicationCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=200)
    nipt: str = Field(min_length=3, max_length=30)
    partner_type: str = Field(pattern="^(Pharmacy|Lab|Imaging|Other)$")
    city: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=5, max_length=300)
    contact_name: str = Field(min_length=2, max_length=200)
    email: str = Field(max_length=254)
    phone: str = Field(min_length=5, max_length=30)
    services: list[str] = Field(default_factory=list)
    coverage_area: str | None = Field(default=None, max_length=300)
    expected_volume: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)


class PartnerApplicationOut(BaseModel):
    id: UUID
    created_at: datetime
    business_name: str
    partner_type: str
    status: str
    reference: str

    model_config = {"from_attributes": True}
