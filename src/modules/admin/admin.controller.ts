import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateDoctorDto } from "./dto/create-doctor.dto";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("doctors")
  async listDoctors() {
    return this.adminService.listDoctors();
  }

  @Post("doctors")
  async createDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.adminService.createDoctor(createDoctorDto);
  }

  @Put("doctors/:id")
  async updateDoctor(@Param("id") id: string, @Body() updateDoctorDto: any) {
    return this.adminService.updateDoctor(id, updateDoctorDto);
  }

  @Delete("doctors/:id")
  async deleteDoctor(@Param("id") id: string) {
    return this.adminService.deleteDoctor(id);
  }

  @Post("doctors/:id/consults")
  async createDoctorConsult(
    @Param("id") id: string,
    @Body() createConsultDto: any,
  ) {
    return this.adminService.createDoctorConsult(id, createConsultDto);
  }

  @Get("doctors/:id/consults")
  async listDoctorConsults(@Param("id") id: string) {
    return this.adminService.listDoctorConsults(id);
  }

  @Get("patients")
  async listPatients() {
    return this.adminService.listPatients();
  }

  @Delete("patients/:id")
  async deletePatient(@Param("id") id: string) {
    return this.adminService.deletePatient(id);
  }

  @Get("consults")
  async listConsults() {
    return this.adminService.listConsults();
  }

  @Post("consults")
  async createConsult(@Body() createConsultDto: any) {
    return this.adminService.createConsult(createConsultDto);
  }

  @Put("consults/:id")
  async updateConsult(@Param("id") id: string, @Body() updateConsultDto: any) {
    return this.adminService.updateConsult(id, updateConsultDto);
  }

  @Delete("consults/:id")
  async deleteConsult(@Param("id") id: string) {
    return this.adminService.deleteConsult(id);
  }

  @Get("doctors/:id/availability/dates")
  async getDoctorSchedule(
    @Param("id") id: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.adminService.getDoctorSchedule(id, from, to);
  }

  @Get("appointments")
  async listAppointments() {
    return this.adminService.listAppointments();
  }

  @Patch("appointments/:id/status")
  async updateAppointmentStatus(
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateAppointmentStatus(id, body.status);
  }

  @Get("revenue")
  async getRevenue(
    @Query("year") year?: number,
    @Query("month") month?: number,
    @Query("day") day?: number,
    @Query("doctor_id") doctorId?: string,
  ) {
    return this.adminService.getRevenue(year, month, day, doctorId);
  }

  @Get("stats")
  async getStats() {
    return this.adminService.getStats();
  }

  @Get("applications/doctors")
  listDoctorApplications() {
    return this.adminService.listDoctorApplications();
  }

  @Patch("applications/doctors/:id/status")
  updateDoctorApplicationStatus(
    @Param("id") id: string,
    @Body() body: { status: string; note?: string },
  ) {
    return this.adminService.updateDoctorApplicationStatus(id, body.status, body.note);
  }

  @Delete("applications/doctors/:id")
  deleteDoctorApplication(@Param("id") id: string) {
    return this.adminService.deleteDoctorApplication(id);
  }

  @Post("notifications/broadcast")
  broadcastNotification(
    @Body() body: { title: string; message: string; target: "all" | "doctors" | "patients" },
  ) {
    return this.adminService.broadcastNotification(body.title, body.message, body.target);
  }
}
