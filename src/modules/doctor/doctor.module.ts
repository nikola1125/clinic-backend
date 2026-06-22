import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DoctorController } from "./doctor.controller";
import { DoctorService } from "./doctor.service";
import { Doctor } from "../../entities/doctor.entity";
import { Patient } from "../../entities/patient.entity";
import { Appointment } from "../../entities/appointment.entity";
import { Consult } from "../../entities/consult.entity";
import { DoctorAvailability } from "../../entities/doctor-availability.entity";
import { MedicalNote } from "../../entities/medical-note.entity";
import { Prescription } from "../../entities/prescription.entity";
import { ChatMessage } from "../../entities/chat-message.entity";
import { ActiveMedication } from "../../entities/active-medication.entity";
import { Diagnosis } from "../../entities/diagnosis.entity";
import { PatientDocument } from "../../entities/patient-document.entity";
import { MedicalProfile } from "../../entities/medical-profile.entity";
import { Meeting } from "../../entities/meeting.entity";
import { DoctorPatientLink } from "../../entities/doctor-patient-link.entity";
import { User } from "../../entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Patient,
      Appointment,
      Consult,
      DoctorAvailability,
      MedicalNote,
      Prescription,
      ChatMessage,
      ActiveMedication,
      Diagnosis,
      PatientDocument,
      MedicalProfile,
      Meeting,
      DoctorPatientLink,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
