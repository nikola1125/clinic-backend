import { IsUUID, IsDateString, IsIn, IsInt } from 'class-validator';

export class AppointmentCreateDto {
  @IsUUID()
  doctor_id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  consult_id: string;

  @IsDateString()
  scheduled_at: string;
}

export class AppointmentOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  doctor_id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  consult_id: string;

  scheduled_at: Date;

  @IsIn(['pending', 'accepted', 'rejected', 'completed'])
  status: 'pending' | 'accepted' | 'rejected' | 'completed';

  @IsInt()
  price_cents: number;

  created_at: Date;

  updated_at: Date;
}

export class SetStatusDto {
  @IsIn(['pending', 'accepted', 'rejected', 'completed'])
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}
