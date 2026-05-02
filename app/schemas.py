from datetime import date, datetime, time
from typing import Annotated, Any, Literal
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
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doctor_id: UUID | None
    full_name: str
    email: str
    phone: str | None
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


# ── Medical Profile ──────────────────────────────────────────────────────────

class MedicalProfileUpdate(BaseModel):
    date_of_birth: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    blood_type: str | None = Field(default=None, max_length=10)
    height_cm: float | None = None
    weight_kg: float | None = None
    allergies: list[Any] = Field(default_factory=list)
    chronic_conditions: list[Any] = Field(default_factory=list)
    emergency_contact: dict[str, Any] = Field(default_factory=dict)
    insurance_info: dict[str, Any] = Field(default_factory=dict)


class MedicalProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    date_of_birth: date | None
    gender: str | None
    blood_type: str | None
    height_cm: float | None
    weight_kg: float | None
    allergies: list[Any]
    chronic_conditions: list[Any]
    emergency_contact: dict[str, Any]
    insurance_info: dict[str, Any]
    updated_at: datetime
    updated_by_doctor_id: UUID | None


# ── Medical Note ─────────────────────────────────────────────────────────────

class MedicalNoteCreate(BaseModel):
    appointment_id: UUID | None = None
    category: Literal["observation", "diagnosis", "follow_up", "general"]
    content: str = Field(min_length=1, max_length=10000)
    is_private: bool = False


class MedicalNoteUpdate(BaseModel):
    category: Literal["observation", "diagnosis", "follow_up", "general"] | None = None
    content: str | None = Field(default=None, min_length=1, max_length=10000)
    is_private: bool | None = None


class MedicalNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: UUID | None
    category: str
    content: str
    is_private: bool
    created_at: datetime
    updated_at: datetime


# ── Prescription ─────────────────────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    appointment_id: UUID | None = None
    medication_name: str = Field(min_length=1, max_length=300)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=200)
    duration_days: int | None = Field(default=None, ge=1, le=3650)
    refills_remaining: int = Field(default=0, ge=0)
    instructions: str | None = Field(default=None, max_length=2000)
    expires_at: datetime | None = None


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: UUID | None
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int | None
    refills_remaining: int
    instructions: str | None
    status: str
    issued_at: datetime
    expires_at: datetime | None


class PrescriptionStatusUpdate(BaseModel):
    status: Literal["active", "expired", "cancelled"]


# ── Active Medication ─────────────────────────────────────────────────────────

class ActiveMedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: str = Field(min_length=1, max_length=200)
    started_at: datetime
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class ActiveMedicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    name: str
    dosage: str
    frequency: str
    started_at: datetime
    ends_at: datetime | None
    status: str
    notes: str | None


class MedicationStatusUpdate(BaseModel):
    status: Literal["active", "stopped"]


# ── Diagnosis ─────────────────────────────────────────────────────────────────

class DiagnosisCreate(BaseModel):
    appointment_id: UUID | None = None
    icd_code: str | None = Field(default=None, max_length=20)
    description: str = Field(min_length=1, max_length=5000)
    severity: Literal["mild", "moderate", "severe"] | None = None
    status: Literal["active", "resolved", "chronic"]
    diagnosed_at: datetime | None = None


class DiagnosisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: UUID | None
    icd_code: str | None
    description: str
    severity: str | None
    status: str
    diagnosed_at: datetime


# ── Patient Document ──────────────────────────────────────────────────────────

class PatientDocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    file_url: str = Field(min_length=1, max_length=2048)
    file_type: str = Field(min_length=1, max_length=100)
    category: Literal["lab", "imaging", "report", "prescription", "other"]


class PatientDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID | None
    title: str
    file_url: str
    file_type: str
    category: str
    uploaded_by: str
    uploaded_at: datetime


# ── Doctor Availability ───────────────────────────────────────────────────────

class AvailabilitySlot(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_duration_min: int = Field(default=30, ge=5, le=240)
    is_active: bool = True


class AvailabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doctor_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_min: int
    is_active: bool


# ── Meeting ───────────────────────────────────────────────────────────────────

class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    appointment_id: UUID
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    duration_seconds: int | None
    doctor_joined_at: datetime | None
    patient_joined_at: datetime | None
    recording_url: str | None


class MeetContextWithMeetingOut(BaseModel):
    role: Literal["doctor", "patient"]
    appointment: AppointmentOut
    doctor_name: str
    patient_full_name: str
    meeting: MeetingOut | None


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: str
    title: str
    body: str
    read: bool
    related_entity_id: UUID | None
    related_entity_type: str | None
    created_at: datetime


# ── Patient Me ────────────────────────────────────────────────────────────────

class PatientMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    phone: str | None
    created_at: datetime
