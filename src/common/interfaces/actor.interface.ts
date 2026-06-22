export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

export interface Actor {
  sub: string;
  role: UserRole;
  doctor_id?: string;
  patient_id?: string;
}
