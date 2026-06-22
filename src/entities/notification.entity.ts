import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_ACCEPTED = 'appointment_accepted',
  APPOINTMENT_REJECTED = 'appointment_rejected',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  PRESCRIPTION_ISSUED = 'prescription_issued',
  MESSAGE_RECEIVED = 'message_received',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  body: string;

  @Column({ type: 'boolean', nullable: false, default: false })
  read: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'related_entity_id' })
  relatedEntityId: string | null;

  @Column({ type: 'text', nullable: true, name: 'related_entity_type' })
  relatedEntityType: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
