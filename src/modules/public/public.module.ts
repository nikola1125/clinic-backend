import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import {
  Doctor,
  Consult,
  DoctorAvailability,
  Appointment,
  Patient,
  DoctorPatientLink,
} from "../../entities";
import { User } from "../../entities/user.entity";
import { SecurityService } from "../../common/services/security.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Consult,
      DoctorAvailability,
      Appointment,
      Patient,
      DoctorPatientLink,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [PublicController],
  providers: [PublicService, SecurityService],
})
export class PublicModule {}
