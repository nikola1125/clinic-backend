import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from "typeorm";
import { Consult } from "./consult.entity";
import { User } from "./user.entity";

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: false, unique: true })
  email: string;

  @Column({ type: "text", nullable: false })
  name: string;

  @Column({ type: "text", nullable: false, default: "" })
  specialty: string;

  @Column({ type: "text", nullable: false, default: "" })
  bio: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "deleted_at" })
  deletedAt: Date | null;

  @Column({ type: "text", nullable: false, default: "UTC" })
  timezone: string;

  @Column({ type: "text", nullable: true, unique: true })
  @Index()
  slug: string | null;

  @Column({ type: "text", nullable: true, name: "portrait_url" })
  portraitUrl: string | null;

  @Column({ type: "text", nullable: false, default: "" })
  hospital: string;

  @Column({ type: "text", nullable: false, default: "" })
  country: string;

  @Column({ type: "text", array: true, nullable: false, default: "{}" })
  languages: string[];

  @Column({
    type: "text",
    nullable: false,
    default: "",
    name: "license_number",
  })
  licenseNumber: string;

  @Column({
    type: "text",
    nullable: false,
    default: "",
    name: "license_authority",
  })
  licenseAuthority: string;

  @Column({
    type: "int",
    nullable: false,
    default: 0,
    name: "years_experience",
  })
  yearsExperience: number;

  @Column({
    type: "int",
    nullable: false,
    default: 28,
    name: "avg_response_minutes",
  })
  avgResponseMinutes: number;

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  training: any[];

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  affiliations: any[];

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  publications: any[];

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  cases: any[];

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  testimonials: any[];

  @OneToMany(() => Consult, (consult) => consult.doctor, { cascade: true })
  consults: Consult[];

  @OneToOne(() => User, (user) => user.doctor, { cascade: true })
  user: User;
}
