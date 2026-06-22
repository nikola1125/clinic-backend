import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PartnerAppStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('partner_applications')
export class PartnerApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'text', nullable: false, name: 'business_name' })
  businessName: string;

  @Column({ type: 'text', nullable: false, unique: true })
  nipt: string;

  @Column({ type: 'text', nullable: false, name: 'partner_type' })
  partnerType: string;

  @Column({ type: 'text', nullable: false })
  city: string;

  @Column({ type: 'text', nullable: false })
  address: string;

  @Column({ type: 'text', nullable: false, name: 'contact_name' })
  contactName: string;

  @Column({ type: 'text', nullable: false })
  email: string;

  @Column({ type: 'text', nullable: false })
  phone: string;

  @Column({ type: 'text', array: true, nullable: false, default: '{}' })
  services: string[];

  @Column({ type: 'text', nullable: true, name: 'coverage_area' })
  coverageArea: string | null;

  @Column({ type: 'text', nullable: true, name: 'expected_volume' })
  expectedVolume: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: PartnerAppStatus, nullable: false, default: PartnerAppStatus.PENDING })
  status: PartnerAppStatus;
}
