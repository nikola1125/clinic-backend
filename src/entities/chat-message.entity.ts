import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, Index } from 'typeorm';

export enum ChatSender {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'appointment_id' })
  @Index()
  appointmentId: string;

  @Column({ type: 'enum', enum: ChatSender, nullable: false })
  sender: ChatSender;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl: string | null;

  @PrimaryColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
