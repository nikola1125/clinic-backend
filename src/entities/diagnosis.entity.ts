import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum DiagnosisSeverity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe",
}

export enum DiagnosisStatus {
  ACTIVE = "active",
  RESOLVED = "resolved",
  CHRONIC = "chronic",
}

@Entity("diagnoses")
export class Diagnosis {
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

  @Column({ type: "text", nullable: true, name: "icd_code" })
  icdCode: string | null;

  @Column({ type: "text", nullable: false })
  description: string;

  @Column({ type: "enum", enum: DiagnosisSeverity, nullable: true })
  severity: DiagnosisSeverity | null;

  @Column({ type: "enum", enum: DiagnosisStatus, nullable: false })
  status: DiagnosisStatus;

  @CreateDateColumn({ type: "timestamptz", name: "diagnosed_at" })
  diagnosedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
