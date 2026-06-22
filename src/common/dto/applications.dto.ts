import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsArray,
  IsObject,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class DoctorApplicationCreateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  full_name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country_of_practice: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  license_number: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  license_authority: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  specialty: string;

  @IsInt()
  @Min(0)
  @Max(60)
  years_experience: number;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  languages: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  hospital_affiliation?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(600)
  essay: string;

  @IsObject()
  availability: Record<string, any> = {};

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cv_url?: string;
}

export class DoctorApplicationOutDto {
  @IsUUID()
  id: string;

  created_at: Date;

  @IsString()
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  specialty: string;

  @IsString()
  status: string;

  @IsString()
  reference: string;
}

export class PartnerApplicationCreateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  business_name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  nipt: string;

  @IsString()
  @Matches(/^(Pharmacy|Lab|Imaging|Other)$/)
  partner_type: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contact_name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone: string;

  @IsArray()
  @IsString({ each: true })
  services: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverage_area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  expected_volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class PartnerApplicationOutDto {
  @IsUUID()
  id: string;

  created_at: Date;

  @IsString()
  business_name: string;

  @IsString()
  partner_type: string;

  @IsString()
  status: string;

  @IsString()
  reference: string;
}
