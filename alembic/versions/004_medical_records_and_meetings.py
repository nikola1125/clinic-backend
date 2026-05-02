"""004 medical records, meetings, availability, notifications

Revision ID: 004
Revises: 003
Create Date: 2026-05-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── medical_profiles ───────────────────────────────────────────────────────
    op.create_table(
        "medical_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("gender", sa.Enum("male", "female", "other", name="gender_enum"), nullable=True),
        sa.Column("blood_type", sa.Text, nullable=True),
        sa.Column("height_cm", sa.Float, nullable=True),
        sa.Column("weight_kg", sa.Float, nullable=True),
        sa.Column("allergies", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("chronic_conditions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("emergency_contact", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("insurance_info", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_by_doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True),
    )

    # ── medical_notes ──────────────────────────────────────────────────────────
    op.create_table(
        "medical_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.Enum("observation", "diagnosis", "follow_up", "general", name="note_category"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("is_private", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_medical_notes_patient_id", "medical_notes", ["patient_id"])

    # ── prescriptions ──────────────────────────────────────────────────────────
    op.create_table(
        "prescriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("medication_name", sa.Text, nullable=False),
        sa.Column("dosage", sa.Text, nullable=False),
        sa.Column("frequency", sa.Text, nullable=False),
        sa.Column("duration_days", sa.Integer, nullable=True),
        sa.Column("refills_remaining", sa.Integer, nullable=False, server_default="0"),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("status", sa.Enum("active", "expired", "cancelled", name="prescription_status"), nullable=False, server_default="active"),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_prescriptions_patient_id", "prescriptions", ["patient_id"])

    # ── active_medications ─────────────────────────────────────────────────────
    op.create_table(
        "active_medications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("dosage", sa.Text, nullable=False),
        sa.Column("frequency", sa.Text, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum("active", "stopped", name="medication_status"), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index("ix_active_medications_patient_id", "active_medications", ["patient_id"])

    # ── diagnoses ──────────────────────────────────────────────────────────────
    op.create_table(
        "diagnoses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("icd_code", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.Enum("mild", "moderate", "severe", name="diagnosis_severity"), nullable=True),
        sa.Column("status", sa.Enum("active", "resolved", "chronic", name="diagnosis_status"), nullable=False),
        sa.Column("diagnosed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_diagnoses_patient_id", "diagnoses", ["patient_id"])

    # ── patient_documents ──────────────────────────────────────────────────────
    op.create_table(
        "patient_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_type", sa.Text, nullable=False),
        sa.Column("category", sa.Enum("lab", "imaging", "report", "prescription", "other", name="document_category"), nullable=False),
        sa.Column("uploaded_by", sa.Enum("doctor", "patient", name="document_uploader"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_patient_documents_patient_id", "patient_documents", ["patient_id"])

    # ── doctor_patient_links ───────────────────────────────────────────────────
    op.create_table(
        "doctor_patient_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("status", sa.Enum("active", "inactive", name="link_status"), nullable=False, server_default="active"),
        sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),
    )

    # ── doctor_availability ────────────────────────────────────────────────────
    op.create_table(
        "doctor_availability",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("slot_duration_min", sa.Integer, nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_doctor_availability_doctor_id", "doctor_availability", ["doctor_id"])

    # ── meetings ───────────────────────────────────────────────────────────────
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("status", sa.Enum("waiting", "active", "ended", name="meeting_status"), nullable=False, server_default="waiting"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("doctor_joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("patient_joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recording_url", sa.Text, nullable=True),
    )

    # ── notifications ──────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("related_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("related_entity_type", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("meetings")
    op.drop_index("ix_doctor_availability_doctor_id", table_name="doctor_availability")
    op.drop_table("doctor_availability")
    op.drop_table("doctor_patient_links")
    op.drop_index("ix_patient_documents_patient_id", table_name="patient_documents")
    op.drop_table("patient_documents")
    op.drop_index("ix_diagnoses_patient_id", table_name="diagnoses")
    op.drop_table("diagnoses")
    op.drop_index("ix_active_medications_patient_id", table_name="active_medications")
    op.drop_table("active_medications")
    op.drop_index("ix_prescriptions_patient_id", table_name="prescriptions")
    op.drop_table("prescriptions")
    op.drop_index("ix_medical_notes_patient_id", table_name="medical_notes")
    op.drop_table("medical_notes")
    op.drop_table("medical_profiles")

    op.execute("DROP TYPE IF EXISTS meeting_status")
    op.execute("DROP TYPE IF EXISTS link_status")
    op.execute("DROP TYPE IF EXISTS document_uploader")
    op.execute("DROP TYPE IF EXISTS document_category")
    op.execute("DROP TYPE IF EXISTS diagnosis_status")
    op.execute("DROP TYPE IF EXISTS diagnosis_severity")
    op.execute("DROP TYPE IF EXISTS medication_status")
    op.execute("DROP TYPE IF EXISTS prescription_status")
    op.execute("DROP TYPE IF EXISTS note_category")
    op.execute("DROP TYPE IF EXISTS gender_enum")
