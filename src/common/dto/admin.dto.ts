import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class DoctorCreateDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(200)
  specialty: string = '';

  @IsString()
  @MaxLength(2000)
  bio: string = '';

  @IsString()
  @MaxLength(100)
  timezone: string = 'UTC';
}

export class DoctorUpdateDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsString()
  @MaxLength(200)
  specialty: string = '';

  @IsString()
  @MaxLength(2000)
  bio: string = '';

  @IsString()
  @MaxLength(100)
  timezone: string = 'UTC';
}

export class DoctorOutDto {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  specialty: string;

  @IsString()
  bio: string;

  @IsString()
  timezone: string = 'UTC';

  @IsOptional()
  updated_at?: Date;
}

export class ConsultCreateDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsInt()
  @Min(0)
  @Max(10_000_000)
  price_cents: number;
}

export class ConsultOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  doctor_id: string;

  @IsString()
  title: string;

  @IsInt()
  price_cents: number;
}

export class RevenueResponseDto {
  @IsNumber()
  total_usd: number;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsInt()
  month?: number;

  @IsOptional()
  @IsInt()
  day?: number;

  @IsOptional()
  @IsUUID()
  doctor_id?: string;
}
