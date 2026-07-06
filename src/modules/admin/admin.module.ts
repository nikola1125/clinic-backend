import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Doctor } from '../../entities/doctor.entity';
import { Patient } from '../../entities/patient.entity';
import { Consult } from '../../entities/consult.entity';
import { Appointment } from '../../entities/appointment.entity';
import { User } from '../../entities/user.entity';
import { DoctorApplication } from '../../entities/doctor-application.entity';
import { Notification } from '../../entities/notification.entity';
import { MedicalNote } from '../../entities/medical-note.entity';
import { MedicalProfile } from '../../entities/medical-profile.entity';
import { Prescription } from '../../entities/prescription.entity';
import { ActiveMedication } from '../../entities/active-medication.entity';
import { Diagnosis } from '../../entities/diagnosis.entity';
import { PatientDocument } from '../../entities/patient-document.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor, Patient, Consult, Appointment, User, DoctorApplication, Notification, MedicalNote, MedicalProfile, Prescription, ActiveMedication, Diagnosis, PatientDocument]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
