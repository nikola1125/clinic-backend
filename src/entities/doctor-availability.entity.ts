import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('doctor_availability')
export class DoctorAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'doctor_id' })
  @Index()
  doctorId: string;

  /** Recurring weekly slot (0=Mon … 6=Sun). Null for date-specific records. */
  @Column({ type: 'int', nullable: true, name: 'day_of_week' })
  dayOfWeek: number | null;

  /** Specific calendar date override. Null for recurring weekly records. */
  @Column({ type: 'date', nullable: true, name: 'specific_date' })
  specificDate: string | null;

  @Column({ type: 'time', nullable: false, name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', nullable: false, name: 'end_time' })
  endTime: string;

  @Column({ type: 'int', nullable: false, default: 30, name: 'slot_duration_min' })
  slotDurationMin: number;

  @Column({ type: 'boolean', nullable: false, default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  timezone: string;
}
