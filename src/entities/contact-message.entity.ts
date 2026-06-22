import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  email: string;

  @Column({ type: 'text', nullable: false, default: 'General enquiry' })
  subject: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'boolean', nullable: false, default: false })
  read: boolean;
}
