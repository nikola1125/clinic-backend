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
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor, Patient, Consult, Appointment, User, DoctorApplication, Notification]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
