"""000 initial schema — create all base tables

Revision ID: 000_initial_schema
Revises:
Create Date: 2026-04-30

Every statement is idempotent so the migration is safe to run against a
fresh database *or* one that was partially set up by a previous failed
deployment (e.g. ENUMs already exist but tables do not).
"""

from alembic import op

revision = "000_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE chat_sender AS ENUM ('patient', 'doctor');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            id          UUID PRIMARY KEY,
            email       TEXT NOT NULL UNIQUE,
            name        TEXT NOT NULL,
            specialty   TEXT NOT NULL DEFAULT '',
            bio         TEXT NOT NULL DEFAULT '',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id           UUID PRIMARY KEY,
            doctor_id    UUID REFERENCES doctors(id) ON DELETE CASCADE,
            full_name    TEXT NOT NULL,
            email        TEXT NOT NULL,
            phone        TEXT,
            notes        TEXT[]  NOT NULL DEFAULT '{}',
            medicines    TEXT[]  NOT NULL DEFAULT '{}',
            prescriptions TEXT[] NOT NULL DEFAULT '{}',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id         UUID PRIMARY KEY,
            username   TEXT UNIQUE,
            email      TEXT NOT NULL UNIQUE,
            hashed_pw  TEXT NOT NULL,
            role       user_role NOT NULL,
            doctor_id  UUID REFERENCES doctors(id)  ON DELETE CASCADE,
            patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            is_active  BOOLEAN NOT NULL DEFAULT true
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email    ON users(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS consults (
            id          UUID PRIMARY KEY,
            doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
            title       TEXT NOT NULL,
            price_cents INTEGER NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id          UUID PRIMARY KEY,
            doctor_id   UUID NOT NULL REFERENCES doctors(id)   ON DELETE CASCADE,
            patient_id  UUID NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
            consult_id  UUID NOT NULL REFERENCES consults(id)  ON DELETE RESTRICT,
            scheduled_at TIMESTAMPTZ NOT NULL,
            status      appointment_status NOT NULL DEFAULT 'pending',
            price_cents INTEGER NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          BIGSERIAL PRIMARY KEY,
            ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
            request_id  TEXT NOT NULL,
            actor_sub   TEXT,
            actor_role  TEXT,
            action      TEXT NOT NULL,
            resource    TEXT NOT NULL,
            resource_id TEXT,
            method      TEXT NOT NULL,
            path        TEXT NOT NULL,
            ip          TEXT,
            user_agent  TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id             UUID PRIMARY KEY,
            appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
            sender         chat_sender NOT NULL,
            message        TEXT NOT NULL,
            image_url      TEXT,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS chat_messages")
    op.execute("DROP TABLE IF EXISTS audit_log")
    op.execute("DROP TABLE IF EXISTS appointments")
    op.execute("DROP TABLE IF EXISTS consults")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TABLE IF EXISTS patients")
    op.execute("DROP TABLE IF EXISTS doctors")
    op.execute("DROP TYPE IF EXISTS chat_sender")
    op.execute("DROP TYPE IF EXISTS appointment_status")
    op.execute("DROP TYPE IF EXISTS user_role")
