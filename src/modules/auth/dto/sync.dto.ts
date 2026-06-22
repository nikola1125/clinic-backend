import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncRequestDto {
  @IsString()
  @MaxLength(200)
  full_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class SyncResponseDto {
  status: string;
  role: string;
}
