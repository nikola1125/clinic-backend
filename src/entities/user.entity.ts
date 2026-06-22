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

export enum UserRole {
  ADMIN = "admin",
  DOCTOR = "doctor",
  PATIENT = "patient",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true, unique: true })
  @Index()
  username: string | null;

  @Column({ type: "text", nullable: false, unique: true })
  @Index()
  email: string;

  @Column({ type: "text", nullable: true, name: "hashed_pw" })
  hashedPw: string | null;

  @Column({ type: "uuid", nullable: true, unique: true, name: "auth_user_id" })
  @Index()
  authUserId: string | null;

  @Column({ type: "enum", enum: UserRole, nullable: false })
  role: UserRole;

  @Column({ type: "uuid", nullable: true, name: "doctor_id" })
  @Index()
  doctorId: string | null;

  @ManyToOne(() => Doctor, (doctor) => doctor.user, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor: Doctor | null;

  @Column({ type: "uuid", nullable: true, name: "patient_id" })
  @Index()
  patientId: string | null;

  @ManyToOne(() => Patient, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_id" })
  patient: Patient | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @Column({
    type: "boolean",
    nullable: false,
    default: true,
    name: "is_active",
  })
  isActive: boolean;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
