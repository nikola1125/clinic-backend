import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

@Entity("medical_profiles")
export class MedicalProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false, unique: true, name: "patient_id" })
  patientId: string;

  @Column({ type: "date", nullable: true, name: "date_of_birth" })
  dateOfBirth: Date | null;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ type: "text", nullable: true, name: "blood_type" })
  bloodType: string | null;

  @Column({ type: "float", nullable: true, name: "height_cm" })
  heightCm: number | null;

  @Column({ type: "float", nullable: true, name: "weight_kg" })
  weightKg: number | null;

  @Column({ type: "jsonb", nullable: false, default: [] })
  allergies: any[];

  @Column({
    type: "jsonb",
    nullable: false,
    default: [],
    name: "chronic_conditions",
  })
  chronicConditions: any[];

  @Column({
    type: "jsonb",
    nullable: false,
    default: {},
    name: "emergency_contact",
  })
  emergencyContact: Record<string, any>;

  @Column({
    type: "jsonb",
    nullable: false,
    default: {},
    name: "insurance_info",
  })
  insuranceInfo: Record<string, any>;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "uuid", nullable: true, name: "updated_by_doctor_id" })
  updatedByDoctorId: string | null;
}
