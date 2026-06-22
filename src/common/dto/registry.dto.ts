import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TrainingItemDto {
  @IsString()
  degree: string;

  @IsString()
  institution: string;

  @IsInt()
  year: number;
}

export class PublicationItemDto {
  @IsString()
  title: string;

  @IsString()
  journal: string;

  @IsInt()
  year: number;
}

export class TestimonialItemDto {
  @IsString()
  quote: string;

  @IsString()
  patient: string;

  @IsString()
  detail: string;
}

export class DoctorListItemDto {
  @IsUUID()
  id: string;

  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  portrait_url?: string;

  @IsString()
  specialty: string;

  @IsString()
  hospital: string;

  @IsString()
  country: string;

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsString()
  license_authority: string;

  @IsInt()
  years_experience: number;

  @IsInt()
  avg_response_minutes: number;

  @IsString()
  bio: string;

  @IsString()
  timezone: string;
}

export class DoctorDetailDto extends DoctorListItemDto {
  @IsString()
  license_number: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingItemDto)
  training: TrainingItemDto[];

  @IsArray()
  @IsString({ each: true })
  affiliations: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationItemDto)
  publications: PublicationItemDto[];

  @IsArray()
  @IsString({ each: true })
  cases: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialItemDto)
  testimonials: TestimonialItemDto[];
}

export class DoctorsPageDto {
  @IsInt()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorListItemDto)
  items: DoctorListItemDto[];
}
