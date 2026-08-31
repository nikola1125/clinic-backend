import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { SPECIALTIES } from "../../../common/specialties";

/**
 * Fields the admin "add doctor" form sends. The global ValidationPipe runs
 * with forbidNonWhitelisted, so this must stay in sync with the frontend
 * createDoctor payload (email, name, username?, password?, specialty?, bio?).
 */
export class CreateDoctorDto {
  @IsEmail()
  @MaxLength(255)
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
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsIn(SPECIALTIES as unknown as string[])
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
