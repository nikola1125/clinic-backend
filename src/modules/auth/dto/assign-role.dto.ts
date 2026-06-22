import { IsString, IsUUID, IsOptional, IsIn } from 'class-validator';

export class AssignRoleRequestDto {
  @IsUUID()
  auth_user_id: string;

  @IsString()
  @IsIn(['admin', 'doctor', 'patient'])
  role: string;

  @IsOptional()
  @IsUUID()
  doctor_id?: string;

  @IsOptional()
  @IsUUID()
  patient_id?: string;
}

export class AssignRoleResponseDto {
  status: string;
  role: string;
}
