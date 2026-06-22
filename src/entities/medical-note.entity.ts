import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum NoteCategory {
  OBSERVATION = "observation",
  DIAGNOSIS = "diagnosis",
  FOLLOW_UP = "follow_up",
  GENERAL = "general",
}

@Entity("medical_notes")
export class MedicalNote {
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

  @Column({ type: "enum", enum: NoteCategory, nullable: false })
  category: NoteCategory;

  @Column({ type: "text", nullable: false })
  content: string;

  @Column({
    type: "boolean",
    nullable: false,
    default: false,
    name: "is_private",
  })
  isPrivate: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
