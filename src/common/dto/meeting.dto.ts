import { IsUUID, IsString, IsOptional, IsInt, IsIn } from 'class-validator';
import { AppointmentOutDto } from './appointment.dto';

export class MeetingOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  appointment_id: string;

  @IsString()
  status: string;

  @IsOptional()
  started_at?: Date;

  @IsOptional()
  ended_at?: Date;

  @IsOptional()
  @IsInt()
  duration_seconds?: number;

  @IsOptional()
  doctor_joined_at?: Date;

  @IsOptional()
  patient_joined_at?: Date;

  @IsOptional()
  @IsString()
  recording_url?: string;
}

export class MeetContextOutDto {
  @IsIn(['doctor', 'patient'])
  role: 'doctor' | 'patient';

  appointment: AppointmentOutDto;

  @IsString()
  doctor_name: string;

  @IsString()
  patient_full_name: string;
}

export class MeetContextWithMeetingOutDto {
  @IsIn(['doctor', 'patient'])
  role: 'doctor' | 'patient';

  appointment: AppointmentOutDto;

  @IsString()
  doctor_name: string;

  @IsString()
  patient_full_name: string;

  @IsOptional()
  meeting?: MeetingOutDto;
}
