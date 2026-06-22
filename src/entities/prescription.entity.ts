import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum PrescriptionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

@Entity("prescriptions")
export class Prescription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false, name: "patient_id" })
  @Index()
  patientId: string;

  @Column({ type: "uuid", nullable: false, name: "doctor_id" })
  @Index()
  doctorId: string;

  @Column({ type: "uuid", nullable: true, name: "appointment_id" })
  @Index()
  appointmentId: string | null;

  @Column({ type: "text", nullable: false, name: "medication_name" })
  medicationName: string;

  @Column({ type: "text", nullable: false })
  dosage: string;

  @Column({ type: "text", nullable: false })
  frequency: string;

  @Column({ type: "int", nullable: true, name: "duration_days" })
  durationDays: number | null;

  @Column({
    type: "int",
    nullable: false,
    default: 0,
    name: "refills_remaining",
  })
  refillsRemaining: number;

  @Column({ type: "text", nullable: true })
  instructions: string | null;

  @Column({
    type: "enum",
    enum: PrescriptionStatus,
    nullable: false,
    default: PrescriptionStatus.ACTIVE,
  })
  status: PrescriptionStatus;

  @CreateDateColumn({ type: "timestamptz", name: "issued_at" })
  issuedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
  expiresAt: Date | null;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
