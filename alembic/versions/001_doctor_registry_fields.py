"""Add registry fields to doctors table

Revision ID: 001_doctor_registry
Revises:
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

revision = "001_doctor_registry"
down_revision = "000_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("slug", sa.Text(), nullable=True, unique=True))
    op.create_index("ix_doctors_slug", "doctors", ["slug"], unique=True)
    op.add_column("doctors", sa.Column("portrait_url", sa.Text(), nullable=True))
    op.add_column("doctors", sa.Column("hospital", sa.Text(), nullable=False, server_default=""))
    op.add_column("doctors", sa.Column("country", sa.Text(), nullable=False, server_default=""))
    op.add_column("doctors", sa.Column("languages", ARRAY(sa.Text()), nullable=False, server_default="{}"))
    op.add_column("doctors", sa.Column("license_number", sa.Text(), nullable=False, server_default=""))
    op.add_column("doctors", sa.Column("license_authority", sa.Text(), nullable=False, server_default=""))
    op.add_column("doctors", sa.Column("years_experience", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("doctors", sa.Column("avg_response_minutes", sa.Integer(), nullable=False, server_default="28"))
    op.add_column("doctors", sa.Column("training", JSONB(), nullable=False, server_default="[]"))
    op.add_column("doctors", sa.Column("affiliations", JSONB(), nullable=False, server_default="[]"))
    op.add_column("doctors", sa.Column("publications", JSONB(), nullable=False, server_default="[]"))
    op.add_column("doctors", sa.Column("cases", JSONB(), nullable=False, server_default="[]"))
    op.add_column("doctors", sa.Column("testimonials", JSONB(), nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_index("ix_doctors_slug", table_name="doctors")
    for col in [
        "slug", "portrait_url", "hospital", "country", "languages",
        "license_number", "license_authority", "years_experience",
        "avg_response_minutes", "training", "affiliations",
        "publications", "cases", "testimonials",
    ]:
        op.drop_column("doctors", col)
