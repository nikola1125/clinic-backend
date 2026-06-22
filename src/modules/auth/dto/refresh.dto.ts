import { IsString } from 'class-validator';

export class RefreshRequestDto {
  @IsString()
  refresh_token: string;
}

export class TokenResponseDto {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  role: string;
  doctor_id?: string;
  patient_id?: string;
}
