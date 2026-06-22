import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum MeetingStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, unique: true, name: 'appointment_id' })
  appointmentId: string;

  @Column({ type: 'enum', enum: MeetingStatus, nullable: false, default: MeetingStatus.WAITING })
  status: MeetingStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'ended_at' })
  endedAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'duration_seconds', insert: false, update: false })
  durationSeconds: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'doctor_joined_at' })
  doctorJoinedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'patient_joined_at' })
  patientJoinedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'recording_url' })
  recordingUrl: string | null;
}
