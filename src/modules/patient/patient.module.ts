import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";
import {
  Patient,
  Appointment,
  MedicalProfile,
  MedicalNote,
  Prescription,
  Diagnosis,
  PatientDocument,
  Notification,
  ChatMessage,
  ActiveMedication,
  User,
} from "../../entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      Appointment,
      MedicalProfile,
      MedicalNote,
      Prescription,
      Diagnosis,
      PatientDocument,
      Notification,
      ChatMessage,
      ActiveMedication,
      User,
    ]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
