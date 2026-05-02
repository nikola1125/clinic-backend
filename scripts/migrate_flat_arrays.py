"""
One-time data migration: convert flat Patient array columns into structured tables.

  Patient.notes[]         → medical_notes  (category="general", is_private=False)
  Patient.medicines[]     → active_medications
  Patient.prescriptions[] → prescriptions

Run AFTER migration 004 has been applied:

    python -m scripts.migrate_flat_arrays

Or directly:

    cd backend-fastapi
    python scripts/migrate_flat_arrays.py

Safe to run multiple times — skips patients that have already been migrated
(detected by checking if any rows already exist for that patient).
"""

import sys
import os
import uuid
from datetime import datetime, timezone

# Allow running from repo root or backend-fastapi/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.db.models import Patient, MedicalNote, ActiveMedication, Prescription


def migrate_patient(db, patient: Patient, dry_run: bool) -> dict:
    stats = {"notes": 0, "medicines": 0, "prescriptions": 0}

    # ── notes → medical_notes ────────────────────────────────────────────────
    existing_notes = db.query(MedicalNote).filter(MedicalNote.patient_id == patient.id).count()
    if existing_notes == 0 and patient.notes:
        for text in patient.notes:
            if not text or not text.strip():
                continue
            note = MedicalNote(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=patient.doctor_id,
                appointment_id=None,
                category="general",
                content=text.strip(),
                is_private=False,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            if not dry_run:
                db.add(note)
            stats["notes"] += 1

    # ── medicines → active_medications ──────────────────────────────────────
    existing_meds = db.query(ActiveMedication).filter(ActiveMedication.patient_id == patient.id).count()
    if existing_meds == 0 and patient.medicines:
        for name in patient.medicines:
            if not name or not name.strip():
                continue
            med = ActiveMedication(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=patient.doctor_id,
                name=name.strip(),
                dosage="unknown",
                frequency="as prescribed",
                started_at=datetime.now(timezone.utc),
                ends_at=None,
                status="active",
                notes="Migrated from legacy flat array",
            )
            if not dry_run:
                db.add(med)
            stats["medicines"] += 1

    # ── prescriptions → prescriptions ────────────────────────────────────────
    existing_rx = db.query(Prescription).filter(Prescription.patient_id == patient.id).count()
    if existing_rx == 0 and patient.prescriptions:
        for rx_text in patient.prescriptions:
            if not rx_text or not rx_text.strip():
                continue
            rx = Prescription(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=patient.doctor_id,
                appointment_id=None,
                medication_name=rx_text.strip(),
                dosage="see notes",
                frequency="as prescribed",
                duration_days=None,
                refills_remaining=0,
                instructions="Migrated from legacy flat array",
                status="active",
                issued_at=datetime.now(timezone.utc),
                expires_at=None,
            )
            if not dry_run:
                db.add(rx)
            stats["prescriptions"] += 1

    return stats


def run(dry_run: bool = False):
    db = SessionLocal()
    try:
        patients = db.query(Patient).all()
        total = {"notes": 0, "medicines": 0, "prescriptions": 0, "patients": 0}

        for patient in patients:
            # Skip patients with no legacy data
            if not any([patient.notes, patient.medicines, patient.prescriptions]):
                continue
            # Skip patients with no doctor (can't assign author)
            if not patient.doctor_id:
                print(f"  SKIP {patient.id} ({patient.full_name}) — no doctor_id, cannot migrate")
                continue

            stats = migrate_patient(db, patient, dry_run)
            if any(stats.values()):
                print(
                    f"  {'[DRY]' if dry_run else 'MIGR'} {patient.full_name:<30}"
                    f"  notes={stats['notes']}"
                    f"  meds={stats['medicines']}"
                    f"  rx={stats['prescriptions']}"
                )
                total["patients"] += 1
                for k in ["notes", "medicines", "prescriptions"]:
                    total[k] += stats[k]

        if not dry_run:
            db.commit()

        print(
            f"\n{'[DRY RUN] ' if dry_run else ''}Done."
            f" Patients={total['patients']}"
            f" Notes={total['notes']}"
            f" Meds={total['medicines']}"
            f" Prescriptions={total['prescriptions']}"
        )

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv or "-n" in sys.argv
    if dry:
        print("=== DRY RUN — no changes will be committed ===\n")
    run(dry_run=dry)
