import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PatientCreateDto {
  @IsOptional()
  @IsUUID()
  doctor_id?: string;

  @IsString()
  @MaxLength(200)
  full_name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class PatientOutDto {
  @IsUUID()
  id: string;

  @IsString()
  full_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  created_at: Date;

  updated_at: Date;
}

export class PatientMeDto {
  @IsUUID()
  id: string;

  @IsString()
  full_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  created_at: Date;

  updated_at: Date;
}
