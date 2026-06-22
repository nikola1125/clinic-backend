import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum DocumentCategory {
  LAB = 'lab',
  IMAGING = 'imaging',
  REPORT = 'report',
  PRESCRIPTION = 'prescription',
  OTHER = 'other',
}

export enum DocumentUploader {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

@Entity('patient_documents')
export class PatientDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'patient_id' })
  @Index()
  patientId: string;

  @Column({ type: 'uuid', nullable: true, name: 'doctor_id' })
  @Index()
  doctorId: string | null;

  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false, name: 'storage_key' })
  storageKey: string;

  @Column({ type: 'text', nullable: false, name: 'file_type' })
  fileType: string;

  @Column({ type: 'enum', enum: DocumentCategory, nullable: false })
  category: DocumentCategory;

  @Column({ type: 'enum', enum: DocumentUploader, nullable: false, name: 'uploaded_by' })
  uploadedBy: DocumentUploader;

  @CreateDateColumn({ type: 'timestamptz', name: 'uploaded_at' })
  uploadedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'bigint', nullable: true, name: 'file_size_bytes' })
  fileSizeBytes: number | null;

  @Column({ type: 'text', nullable: true, name: 'mime_type' })
  mimeType: string | null;

  @Column({ type: 'text', nullable: true })
  checksum: string | null;

  @Column({ type: 'text', nullable: false, default: 'pending', name: 'virus_scan_status' })
  virusScanStatus: string;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'encrypted_at_rest' })
  encryptedAtRest: boolean;
}
