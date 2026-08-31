/**
 * Canonical list of doctor types (specialties). This is the single source of
 * truth on the backend — the admin "add/edit doctor" form validates against
 * it, and patient medical records are grouped by the authoring doctor's
 * specialty. Keep in sync with the frontend copy at clinic-m/src/lib/specialties.ts.
 */
export const SPECIALTIES = [
  "General Practice",
  "Internal Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Psychiatry",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Gynecology",
  "Obstetrics",
  "Ophthalmology",
  "ENT (Otolaryngology)",
  "Dentistry",
  "Endocrinology",
  "Gastroenterology",
  "Urology",
  "Pulmonology",
  "Nephrology",
  "Rheumatology",
  "Radiology",
  "Anesthesiology",
  "General Surgery",
  "Physiotherapy",
  "Nutrition",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
