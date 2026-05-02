import uuid

from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, Float, Integer, String, Text, ForeignKey, Time, UniqueConstraint, func, Boolean
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(Text, nullable=True, unique=True, index=True)
    email = Column(Text, nullable=False, unique=True, index=True)
    hashed_pw = Column(Text, nullable=False)
    role = Column(Enum("admin", "doctor", "patient", name="user_role"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True)
    doctor = relationship("Doctor", back_populates="user")
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    name = Column(Text, nullable=False)
    specialty = Column(Text, nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Registry fields
    slug = Column(Text, nullable=True, unique=True, index=True)
    portrait_url = Column(Text, nullable=True)
    hospital = Column(Text, nullable=False, default="")
    country = Column(Text, nullable=False, default="")
    languages = Column(ARRAY(Text), nullable=False, default=list)
    license_number = Column(Text, nullable=False, default="")
    license_authority = Column(Text, nullable=False, default="")
    years_experience = Column(Integer, nullable=False, default=0)
    avg_response_minutes = Column(Integer, nullable=False, default=28)
    training = Column(JSONB, nullable=False, default=list)
    affiliations = Column(JSONB, nullable=False, default=list)
    publications = Column(JSONB, nullable=False, default=list)
    cases = Column(JSONB, nullable=False, default=list)
    testimonials = Column(JSONB, nullable=False, default=list)

    consults = relationship("Consult", back_populates="doctor", cascade="all, delete")
    user = relationship("User", back_populates="doctor", uselist=False, cascade="all, delete")


class Consult(Base):
    __tablename__ = "consults"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    price_cents = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    doctor = relationship("Doctor", back_populates="consults")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True)
    full_name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    phone = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    consult_id = Column(UUID(as_uuid=True), ForeignKey("consults.id", ondelete="RESTRICT"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(
            "pending",
            "accepted",
            "rejected",
            "completed",
            name="appointment_status",
        ),
        nullable=False,
        default="pending",
    )
    price_cents = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ts = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    request_id = Column(Text, nullable=False)
    actor_sub = Column(Text)
    actor_role = Column(Text)
    action = Column(Text, nullable=False)
    resource = Column(Text, nullable=False)
    resource_id = Column(Text)
    method = Column(Text, nullable=False)
    path = Column(Text, nullable=False)
    ip = Column(Text)
    user_agent = Column(Text)


class DoctorApplication(Base):
    __tablename__ = "doctor_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    full_name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    country_of_practice = Column(Text, nullable=False)
    license_number = Column(Text, nullable=False)
    license_authority = Column(Text, nullable=False)
    specialty = Column(Text, nullable=False)
    years_experience = Column(Integer, nullable=False, default=0)
    languages = Column(ARRAY(Text), nullable=False, default=list)
    hospital_affiliation = Column(Text, nullable=True)
    essay = Column(Text, nullable=False)
    availability = Column(JSONB, nullable=False, default=dict)
    cv_url = Column(Text, nullable=True)
    status = Column(
        Enum("pending", "reviewing", "approved", "rejected", name="doctor_app_status"),
        nullable=False,
        default="pending",
    )


class PartnerApplication(Base):
    __tablename__ = "partner_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    business_name = Column(Text, nullable=False)
    nipt = Column(Text, nullable=False)
    partner_type = Column(Text, nullable=False)
    city = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    contact_name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    services = Column(ARRAY(Text), nullable=False, default=list)
    coverage_area = Column(Text, nullable=True)
    expected_volume = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(
        Enum("pending", "reviewing", "approved", "rejected", name="partner_app_status"),
        nullable=False,
        default="pending",
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    subject = Column(Text, nullable=False, default="General enquiry")
    message = Column(Text, nullable=False)
    read = Column(Boolean, nullable=False, default=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    sender = Column(Enum("patient", "doctor", name="chat_sender"), nullable=False)
    message = Column(Text, nullable=False)
    image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MedicalProfile(Base):
    __tablename__ = "medical_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Enum("male", "female", "other", name="gender_enum"), nullable=True)
    blood_type = Column(Text, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    allergies = Column(JSONB, nullable=False, default=list)
    chronic_conditions = Column(JSONB, nullable=False, default=list)
    emergency_contact = Column(JSONB, nullable=False, default=dict)
    insurance_info = Column(JSONB, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by_doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)


class MedicalNote(Base):
    __tablename__ = "medical_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    category = Column(Enum("observation", "diagnosis", "follow_up", "general", name="note_category"), nullable=False)
    content = Column(Text, nullable=False)
    is_private = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    medication_name = Column(Text, nullable=False)
    dosage = Column(Text, nullable=False)
    frequency = Column(Text, nullable=False)
    duration_days = Column(Integer, nullable=True)
    refills_remaining = Column(Integer, nullable=False, default=0)
    instructions = Column(Text, nullable=True)
    status = Column(Enum("active", "expired", "cancelled", name="prescription_status"), nullable=False, default="active")
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)


class ActiveMedication(Base):
    __tablename__ = "active_medications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    dosage = Column(Text, nullable=False)
    frequency = Column(Text, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum("active", "stopped", name="medication_status"), nullable=False, default="active")
    notes = Column(Text, nullable=True)


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    icd_code = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    severity = Column(Enum("mild", "moderate", "severe", name="diagnosis_severity"), nullable=True)
    status = Column(Enum("active", "resolved", "chronic", name="diagnosis_status"), nullable=False)
    diagnosed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PatientDocument(Base):
    __tablename__ = "patient_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    title = Column(Text, nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(Text, nullable=False)
    category = Column(Enum("lab", "imaging", "report", "prescription", "other", name="document_category"), nullable=False)
    uploaded_by = Column(Enum("doctor", "patient", name="document_uploader"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DoctorPatientLink(Base):
    __tablename__ = "doctor_patient_links"
    __table_args__ = (UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, nullable=False, default=True)
    status = Column(Enum("active", "inactive", name="link_status"), nullable=False, default="active")
    linked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration_min = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, nullable=False, default=True)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    status = Column(Enum("waiting", "active", "ended", name="meeting_status"), nullable=False, default="waiting")
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    doctor_joined_at = Column(DateTime(timezone=True), nullable=True)
    patient_joined_at = Column(DateTime(timezone=True), nullable=True)
    recording_url = Column(Text, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    read = Column(Boolean, nullable=False, default=False)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    related_entity_type = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
