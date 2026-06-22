import {
  IsInt,
  IsString,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
  start_time: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
  end_time: string;

  @IsInt()
  @Min(5)
  @Max(240)
  slot_duration_min: number = 30;

  @IsBoolean()
  is_active: boolean = true;
}

export class AvailabilityOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  doctor_id: string;

  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsInt()
  slot_duration_min: number;

  @IsBoolean()
  is_active: boolean;

  @IsString()
  timezone: string = 'UTC';
}
