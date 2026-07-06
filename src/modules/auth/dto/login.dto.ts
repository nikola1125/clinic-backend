import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Login accepts either an email or a username, plus a password.
 * No length/format rules on the password here — this only verifies an
 * existing credential; rules belong on registration.
 */
export class LoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @IsString()
  @MaxLength(255)
  password: string;
}
