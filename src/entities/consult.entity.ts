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

@Entity("consults")
export class Consult {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false, name: "doctor_id" })
  @Index()
  doctorId: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.consults, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor: Doctor;

  @Column({ type: "text", nullable: false })
  title: string;

  @Column({ type: "int", nullable: false, name: "price_cents" })
  priceCents: number;

  @Column({
    type: "boolean",
    nullable: false,
    default: true,
    name: "is_active",
  })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
