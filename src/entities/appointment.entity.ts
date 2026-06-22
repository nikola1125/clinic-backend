import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Doctor } from "./doctor.entity";
import { Patient } from "./patient.entity";
import { Consult } from "./consult.entity";

export enum AppointmentStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false, name: "doctor_id" })
  @Index()
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor: Doctor;

  @Column({ type: "uuid", nullable: false, name: "patient_id" })
  @Index()
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_id" })
  patient: Patient;

  @Column({ type: "uuid", nullable: false, name: "consult_id" })
  @Index()
  consultId: string;

  @ManyToOne(() => Consult, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "consult_id" })
  consult: Consult;

  @Column({ type: "timestamptz", nullable: false, name: "scheduled_at" })
  scheduledAt: Date;

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    nullable: false,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: "timestamptz", nullable: true, name: "accepted_at" })
  acceptedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "rejected_at" })
  rejectedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "completed_at" })
  completedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "joined_call_at" })
  joinedCallAt: Date | null;

  @Column({ type: "int", nullable: false, name: "price_cents" })
  priceCents: number;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
