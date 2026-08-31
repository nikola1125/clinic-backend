import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { PatientService } from "./patient.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetActor } from "../../common/decorators/actor.decorator";
import { Actor } from "../../common/interfaces/actor.interface";
import { UpdateMeDto } from "./dto/update-me.dto";

@Controller("patient")
@UseGuards(AuthGuard, RolesGuard)
@Roles("patient")
export class PatientController {
  constructor(private service: PatientService) {}

  @Get("me")
  getMe(@GetActor() actor: Actor) {
    return this.service.getMe(actor.patient_id);
  }

  @Patch("me")
  updateMe(@GetActor() actor: Actor, @Body() dto: UpdateMeDto) {
    return this.service.updateMe(actor.patient_id, dto);
  }

  @Get("appointments")
  getAppointments(@GetActor() actor: Actor) {
    return this.service.getAppointments(actor.patient_id);
  }

  @Get("appointments/:id")
  getAppointment(@Param("id") id: string, @GetActor() actor: Actor) {
    return this.service.getAppointment(id, actor.patient_id);
  }

  @Get("appointments/:id/chat")
  getChat(@Param("id") id: string, @GetActor() actor: Actor) {
    return this.service.getChat(id, actor.patient_id);
  }

  @Post("appointments/:id/chat")
  sendChat(
    @Param("id") id: string,
    @Body() body: any,
    @GetActor() actor: Actor,
  ) {
    return this.service.sendChat(id, actor.patient_id, body);
  }

  @Get("medical-profile")
  getMedicalProfile(@GetActor() actor: Actor) {
    return this.service.getMedicalProfile(actor.patient_id);
  }

  @Get("notes")
  getNotes(@GetActor() actor: Actor) {
    return this.service.getNotes(actor.patient_id);
  }

  @Get("prescriptions")
  getPrescriptions(@GetActor() actor: Actor) {
    return this.service.getPrescriptions(actor.patient_id);
  }

  @Get("diagnoses")
  getDiagnoses(@GetActor() actor: Actor) {
    return this.service.getDiagnoses(actor.patient_id);
  }

  @Get("medications")
  getMedications(@GetActor() actor: Actor) {
    return this.service.getMedications(actor.patient_id);
  }

  @Get("documents")
  getDocuments(@GetActor() actor: Actor) {
    return this.service.getDocuments(actor.patient_id);
  }

  @Get("notifications")
  getNotifications(@GetActor() actor: Actor) {
    return this.service.getNotifications(actor.sub);
  }

  @Patch("notifications/:id/read")
  markNotificationRead(@Param("id") id: string, @GetActor() actor: Actor) {
    return this.service.markNotificationRead(id, actor.sub);
  }
}
