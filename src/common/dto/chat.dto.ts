import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class ChatMessageCreateDto {
  @IsString()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  image_url?: string;
}

export class ChatMessageOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  appointment_id: string;

  @IsIn(['patient', 'doctor'])
  sender: 'patient' | 'doctor';

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  created_at: Date;
}
