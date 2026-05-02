"""005 updated_at triggers and api.ts cleanup

Revision ID: 005
Revises: 004
Create Date: 2026-05-02

Adds:
  - A reusable PL/pgSQL function update_updated_at_column()
  - Triggers on medical_notes (and any future tables that need auto updated_at)
"""

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Reusable trigger function ───────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # ── medical_notes.updated_at ────────────────────────────────────────────────
    op.execute("""
        CREATE TRIGGER trg_medical_notes_updated_at
        BEFORE UPDATE ON medical_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)

    # ── medical_profiles.updated_at ────────────────────────────────────────────
    op.execute("""
        CREATE TRIGGER trg_medical_profiles_updated_at
        BEFORE UPDATE ON medical_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_medical_profiles_updated_at ON medical_profiles")
    op.execute("DROP TRIGGER IF EXISTS trg_medical_notes_updated_at ON medical_notes")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
