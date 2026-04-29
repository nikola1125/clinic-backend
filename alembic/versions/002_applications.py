"""002 applications tables

Revision ID: 002
Revises: 001
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001_doctor_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctor_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("full_name", sa.Text, nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("country_of_practice", sa.Text, nullable=False),
        sa.Column("license_number", sa.Text, nullable=False),
        sa.Column("license_authority", sa.Text, nullable=False),
        sa.Column("specialty", sa.Text, nullable=False),
        sa.Column("years_experience", sa.Integer, nullable=False, server_default="0"),
        sa.Column("languages", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("hospital_affiliation", sa.Text, nullable=True),
        sa.Column("essay", sa.Text, nullable=False),
        sa.Column("availability", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("cv_url", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "reviewing", "approved", "rejected", name="doctor_app_status"),
            nullable=False,
            server_default="pending",
        ),
    )

    op.create_table(
        "partner_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("business_name", sa.Text, nullable=False),
        sa.Column("nipt", sa.Text, nullable=False),
        sa.Column("partner_type", sa.Text, nullable=False),
        sa.Column("city", sa.Text, nullable=False),
        sa.Column("address", sa.Text, nullable=False),
        sa.Column("contact_name", sa.Text, nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("phone", sa.Text, nullable=False),
        sa.Column("services", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("coverage_area", sa.Text, nullable=True),
        sa.Column("expected_volume", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "reviewing", "approved", "rejected", name="partner_app_status"),
            nullable=False,
            server_default="pending",
        ),
    )


def downgrade() -> None:
    op.drop_table("partner_applications")
    op.drop_table("doctor_applications")
    op.execute("DROP TYPE IF EXISTS partner_app_status")
    op.execute("DROP TYPE IF EXISTS doctor_app_status")
