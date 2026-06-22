import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

export enum LinkStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('doctor_patient_links')
@Unique('uq_doctor_patient', ['doctorId', 'patientId'])
export class DoctorPatientLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'doctor_id' })
  @Index()
  doctorId: string;

  @Column({ type: 'uuid', nullable: false, name: 'patient_id' })
  @Index()
  patientId: string;

  @Column({ type: 'boolean', nullable: false, default: true, name: 'is_primary' })
  isPrimary: boolean;

  @Column({ type: 'enum', enum: LinkStatus, nullable: false, default: LinkStatus.ACTIVE })
  status: LinkStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'linked_at' })
  linkedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
