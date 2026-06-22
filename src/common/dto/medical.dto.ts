import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class MedicalProfileUpdateDto {
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_type?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsArray()
  allergies: any[] = [];

  @IsArray()
  chronic_conditions: any[] = [];

  @IsObject()
  emergency_contact: Record<string, any> = {};

  @IsObject()
  insurance_info: Record<string, any> = {};
}

export class MedicalProfileOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsOptional()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  blood_type?: string;

  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  weight_kg?: number;

  @IsArray()
  allergies: any[];

  @IsArray()
  chronic_conditions: any[];

  @IsObject()
  emergency_contact: Record<string, any>;

  @IsObject()
  insurance_info: Record<string, any>;

  updated_at: Date;

  @IsOptional()
  @IsUUID()
  updated_by_doctor_id?: string;
}

export class MedicalNoteCreateDto {
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsIn(['observation', 'diagnosis', 'follow_up', 'general'])
  category: 'observation' | 'diagnosis' | 'follow_up' | 'general';

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @IsBoolean()
  is_private: boolean = false;
}

export class MedicalNoteUpdateDto {
  @IsOptional()
  @IsIn(['observation', 'diagnosis', 'follow_up', 'general'])
  category?: 'observation' | 'diagnosis' | 'follow_up' | 'general';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  is_private?: boolean;
}

export class MedicalNoteOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  doctor_id: string;

  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsString()
  category: string;

  @IsString()
  content: string;

  @IsBoolean()
  is_private: boolean;

  created_at: Date;

  updated_at: Date;
}

export class PrescriptionCreateDto {
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  medication_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  dosage: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  duration_days?: number;

  @IsInt()
  @Min(0)
  refills_remaining: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class PrescriptionOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  doctor_id: string;

  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsString()
  medication_name: string;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;

  @IsOptional()
  @IsInt()
  duration_days?: number;

  @IsInt()
  refills_remaining: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsString()
  status: string;

  issued_at: Date;

  @IsOptional()
  expires_at?: Date;

  updated_at: Date;
}

export class PrescriptionStatusUpdateDto {
  @IsIn(['active', 'expired', 'cancelled'])
  status: 'active' | 'expired' | 'cancelled';
}

export class ActiveMedicationCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  dosage: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  frequency: string;

  @IsDateString()
  started_at: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ActiveMedicationOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  doctor_id: string;

  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;

  started_at: Date;

  @IsOptional()
  ends_at?: Date;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MedicationStatusUpdateDto {
  @IsIn(['active', 'stopped'])
  status: 'active' | 'stopped';
}

export class DiagnosisCreateDto {
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icd_code?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsIn(['mild', 'moderate', 'severe'])
  severity?: 'mild' | 'moderate' | 'severe';

  @IsIn(['active', 'resolved', 'chronic'])
  status: 'active' | 'resolved' | 'chronic';

  @IsOptional()
  @IsDateString()
  diagnosed_at?: string;
}

export class DiagnosisOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  doctor_id: string;

  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  icd_code?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsString()
  status: string;

  diagnosed_at: Date;

  updated_at: Date;
}

export class PatientDocumentCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  storage_key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  file_type: string;

  @IsIn(['lab', 'imaging', 'report', 'prescription', 'other'])
  category: 'lab' | 'imaging' | 'report' | 'prescription' | 'other';

  @IsOptional()
  @IsInt()
  @Min(1)
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mime_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;
}

export class PatientDocumentOutDto {
  @IsUUID()
  id: string;

  @IsUUID()
  patient_id: string;

  @IsOptional()
  @IsUUID()
  doctor_id?: string;

  @IsString()
  title: string;

  @IsString()
  storage_key: string;

  @IsString()
  signed_url: string;

  @IsString()
  file_type: string;

  @IsString()
  category: string;

  @IsString()
  uploaded_by: string;

  uploaded_at: Date;

  @IsOptional()
  @IsInt()
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsString()
  virus_scan_status: string = 'pending';

  @IsBoolean()
  encrypted_at_rest: boolean = false;
}
