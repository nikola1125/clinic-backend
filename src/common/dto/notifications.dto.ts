import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class NotificationOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  user_id: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsBoolean()
  read: boolean;

  @IsOptional()
  @IsUUID()
  related_entity_id?: string;

  @IsOptional()
  @IsString()
  related_entity_type?: string;

  created_at: Date;

  updated_at: Date;
}
