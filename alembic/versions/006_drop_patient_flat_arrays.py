"""006 drop legacy Patient flat array columns

Revision ID: 006
Revises: 005
Create Date: 2026-05-02

Run ONLY after:
  1. Migration 004 has been applied (new tables exist)
  2. scripts/migrate_flat_arrays.py has been run and verified
  3. You are satisfied that no data is lost

Drops: patients.notes, patients.medicines, patients.prescriptions
"""

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("patients", "notes")
    op.drop_column("patients", "medicines")
    op.drop_column("patients", "prescriptions")


def downgrade() -> None:
    import sqlalchemy as sa
    from sqlalchemy.dialects import postgresql

    op.add_column("patients", sa.Column(
        "notes", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}",
    ))
    op.add_column("patients", sa.Column(
        "medicines", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}",
    ))
    op.add_column("patients", sa.Column(
        "prescriptions", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}",
    ))
