import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum MedicationStatus {
  ACTIVE = "active",
  STOPPED = "stopped",
}

@Entity("active_medications")
export class ActiveMedication {
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

  @Column({ type: "text", nullable: false })
  name: string;

  @Column({ type: "text", nullable: false })
  dosage: string;

  @Column({ type: "text", nullable: false })
  frequency: string;

  @Column({ type: "timestamptz", nullable: false, name: "started_at" })
  startedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "ends_at" })
  endsAt: Date | null;

  @Column({
    type: "enum",
    enum: MedicationStatus,
    nullable: false,
    default: MedicationStatus.ACTIVE,
  })
  status: MedicationStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
