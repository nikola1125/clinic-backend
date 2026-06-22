import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("patients")
export class Patient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: false, name: "full_name" })
  fullName: string;

  @Column({ type: "text", nullable: false, unique: true })
  email: string;

  @Column({ type: "text", nullable: true })
  phone: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;
}
