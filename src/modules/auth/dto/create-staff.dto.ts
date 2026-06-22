import { IsEmail, IsString, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator';

export class CreateStaffRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsIn(['admin', 'doctor'])
  role: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;
}

export class CreateStaffResponseDto {
  message: string;
  user_id?: string;
}
