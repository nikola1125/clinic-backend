import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum DoctorAppStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('doctor_applications')
export class DoctorApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'text', nullable: false, name: 'full_name' })
  fullName: string;

  @Column({ type: 'text', nullable: false, unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: false, name: 'country_of_practice' })
  countryOfPractice: string;

  @Column({ type: 'text', nullable: false, name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'text', nullable: false, name: 'license_authority' })
  licenseAuthority: string;

  @Column({ type: 'text', nullable: false })
  specialty: string;

  @Column({ type: 'int', nullable: false, default: 0, name: 'years_experience' })
  yearsExperience: number;

  @Column({ type: 'text', array: true, nullable: false, default: '{}' })
  languages: string[];

  @Column({ type: 'text', nullable: true, name: 'hospital_affiliation' })
  hospitalAffiliation: string | null;

  @Column({ type: 'text', nullable: false })
  essay: string;

  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  availability: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'cv_url' })
  cvUrl: string | null;

  @Column({ type: 'enum', enum: DoctorAppStatus, nullable: false, default: DoctorAppStatus.PENDING })
  status: DoctorAppStatus;
}
