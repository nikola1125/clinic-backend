import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PublicService } from "./public.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppointmentCreateDto } from "../../common/dto/appointment.dto";
import { PatientCreateDto } from "../../common/dto/patient.dto";

@Controller("public")
export class PublicController {
  constructor(private service: PublicService) {}

  @Get("doctors")
  listDoctors() {
    return this.service.listDoctors();
  }

  @Get("doctors/:id/availability")
  getDoctorAvailability(@Param("id") id: string) {
    return this.service.getDoctorAvailability(id);
  }

  @Get("doctors/:id/availability/dates")
  getDoctorAvailabilityDates(
    @Param("id") id: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.service.getDoctorAvailabilityDates(id, from, to);
  }

  @Get("doctors/:id/consults")
  getDoctorConsults(@Param("id") id: string) {
    return this.service.getDoctorConsults(id);
  }

  @Post("appointments")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("patient")
  bookAppointment(@Body() payload: AppointmentCreateDto, @Request() req: any) {
    return this.service.bookAppointment(payload, req.actor);
  }

  @Post("patients")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("patient")
  createPatient(@Body() payload: PatientCreateDto, @Request() req: any) {
    return this.service.createPatient(payload, req.actor);
  }
}
