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
  Request,
} from "@nestjs/common";
import { DoctorService } from "./doctor.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("doctor")
@UseGuards(AuthGuard, RolesGuard)
@Roles("doctor")
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get("profile")
  async getProfile(@Request() req: any) {
    return this.doctorService.getProfile(req.actor.doctor_id);
  }

  @Put("profile")
  async updateProfile(@Request() req: any, @Body() updateProfileDto: any) {
    return this.doctorService.updateProfile(req.actor.doctor_id, updateProfileDto);
  }

  @Get("availability")
  async getAvailability(@Request() req: any) {
    return this.doctorService.getAvailability(req.actor.doctor_id);
  }

  @Post("availability")
  async setAvailability(@Request() req: any, @Body() availabilityDto: any) {
    return this.doctorService.setAvailability(req.actor.doctor_id, availabilityDto);
  }

  @Put("availability")
  async upsertAvailability(@Request() req: any, @Body() availabilityDto: any) {
    return this.doctorService.upsertAvailability(
      req.actor.doctor_id,
      availabilityDto,
    );
  }

  @Get("availability/dates")
  async getDateAvailability(
    @Request() req: any,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.doctorService.getDateAvailability(req.actor.doctor_id, from, to);
  }

  @Put("availability/dates")
  async upsertDateAvailability(@Request() req: any, @Body() body: any) {
    return this.doctorService.upsertDateAvailability(req.actor.doctor_id, body);
  }

  @Get("patients")
  async getPatients(@Request() req: any) {
    return this.doctorService.getPatients(req.actor.doctor_id);
  }

  @Get("patients/:id")
  async getPatient(@Request() req: any, @Param("id") patientId: string) {
    return this.doctorService.getPatient(req.actor.doctor_id, patientId);
  }

  @Get("appointments")
  async getAppointments(@Request() req: any, @Query("status") status?: string) {
    return this.doctorService.getAppointments(req.actor.doctor_id, status);
  }

  @Get("appointments/:id")
  async getAppointment(
    @Request() req: any,
    @Param("id") appointmentId: string,
  ) {
    return this.doctorService.getAppointment(req.actor.doctor_id, appointmentId);
  }

  @Put("appointments/:id")
  async updateAppointment(
    @Request() req: any,
    @Param("id") appointmentId: string,
    @Body() updateDto: any,
  ) {
    return this.doctorService.updateAppointment(
      req.actor.doctor_id,
      appointmentId,
      updateDto,
    );
  }

  @Get("consults")
  async getConsults(@Request() req: any) {
    return this.doctorService.getConsults(req.actor.doctor_id);
  }

  @Post("consults/:id/notes")
  async addNote(
    @Request() req: any,
    @Param("id") consultId: string,
    @Body() noteDto: any,
  ) {
    return this.doctorService.addNote(req.actor.doctor_id, consultId, noteDto);
  }

  @Post("prescriptions")
  async createPrescription(@Request() req: any, @Body() prescriptionDto: any) {
    return this.doctorService.createPrescription(req.actor.doctor_id, prescriptionDto);
  }

  @Patch("appointments/:id/status")
  async updateAppointmentStatus(
    @Request() req: any,
    @Param("id") appointmentId: string,
    @Body() statusDto: any,
  ) {
    return this.doctorService.updateAppointmentStatus(
      req.actor.doctor_id,
      appointmentId,
      statusDto,
    );
  }

  @Post("appointments")
  async createAppointment(@Request() req: any, @Body() appointmentDto: any) {
    return this.doctorService.createAppointment(req.actor.doctor_id, appointmentDto);
  }

  @Get("appointments/:id/chat")
  async getChatMessages(
    @Request() req: any,
    @Param("id") appointmentId: string,
  ) {
    return this.doctorService.getChatMessages(req.actor.doctor_id, appointmentId);
  }

  @Post("appointments/:id/chat")
  async sendChatMessage(
    @Request() req: any,
    @Param("id") appointmentId: string,
    @Body() messageDto: any,
  ) {
    return this.doctorService.sendChatMessage(
      req.actor.doctor_id,
      appointmentId,
      messageDto,
    );
  }

  @Get("patients/:id/notes")
  async getPatientNotes(@Request() req: any, @Param("id") patientId: string) {
    return this.doctorService.getPatientNotes(req.actor.doctor_id, patientId);
  }

  @Post("patients/:id/notes")
  async createPatientNote(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() noteDto: any,
  ) {
    return this.doctorService.createPatientNote(
      req.actor.doctor_id,
      patientId,
      noteDto,
    );
  }

  @Patch("patients/:id/notes/:noteId")
  async updatePatientNote(
    @Request() req: any,
    @Param("id") patientId: string,
    @Param("noteId") noteId: string,
    @Body() noteDto: any,
  ) {
    return this.doctorService.updatePatientNote(
      req.actor.doctor_id,
      patientId,
      noteId,
      noteDto,
    );
  }

  @Delete("patients/:id/notes/:noteId")
  async deletePatientNote(
    @Request() req: any,
    @Param("id") patientId: string,
    @Param("noteId") noteId: string,
  ) {
    return this.doctorService.deletePatientNote(
      req.actor.doctor_id,
      patientId,
      noteId,
    );
  }

  @Get("patients/:id/prescriptions")
  async getPatientPrescriptions(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientPrescriptions(req.actor.doctor_id, patientId);
  }

  @Post("patients/:id/prescriptions")
  async createPatientPrescription(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() prescriptionDto: any,
  ) {
    return this.doctorService.createPatientPrescription(
      req.actor.doctor_id,
      patientId,
      prescriptionDto,
    );
  }

  @Patch("patients/:id/prescriptions/:rxId/status")
  async updatePrescriptionStatus(
    @Request() req: any,
    @Param("id") patientId: string,
    @Param("rxId") rxId: string,
    @Body() statusDto: any,
  ) {
    return this.doctorService.updatePrescriptionStatus(
      req.actor.doctor_id,
      patientId,
      rxId,
      statusDto,
    );
  }

  @Get("patients/:id/medications")
  async getPatientMedications(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientMedications(req.actor.doctor_id, patientId);
  }

  @Post("patients/:id/medications")
  async createPatientMedication(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() medicationDto: any,
  ) {
    return this.doctorService.createPatientMedication(
      req.actor.doctor_id,
      patientId,
      medicationDto,
    );
  }

  @Patch("patients/:id/medications/:medId/status")
  async updateMedicationStatus(
    @Request() req: any,
    @Param("id") patientId: string,
    @Param("medId") medId: string,
    @Body() statusDto: any,
  ) {
    return this.doctorService.updateMedicationStatus(
      req.actor.doctor_id,
      patientId,
      medId,
      statusDto,
    );
  }

  @Get("patients/:id/diagnoses")
  async getPatientDiagnoses(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientDiagnoses(req.actor.doctor_id, patientId);
  }

  @Post("patients/:id/diagnoses")
  async createPatientDiagnosis(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() diagnosisDto: any,
  ) {
    return this.doctorService.createPatientDiagnosis(
      req.actor.doctor_id,
      patientId,
      diagnosisDto,
    );
  }

  @Get("patients/:id/documents")
  async getPatientDocuments(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientDocuments(req.actor.doctor_id, patientId);
  }

  @Post("patients/:id/documents")
  async uploadPatientDocument(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() documentDto: any,
  ) {
    return this.doctorService.uploadPatientDocument(
      req.actor.doctor_id,
      patientId,
      documentDto,
    );
  }

  @Get("patients/:id/medical-profile")
  async getPatientMedicalProfile(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientMedicalProfile(req.actor.doctor_id, patientId);
  }

  @Put("patients/:id/medical-profile")
  async updatePatientMedicalProfile(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() profileDto: any,
  ) {
    return this.doctorService.updatePatientMedicalProfile(
      req.actor.doctor_id,
      patientId,
      profileDto,
    );
  }

  @Get("patients/:id/timeline")
  async getPatientTimeline(
    @Request() req: any,
    @Param("id") patientId: string,
  ) {
    return this.doctorService.getPatientTimeline(req.actor.doctor_id, patientId);
  }

  @Post("meetings/:id/start")
  async startMeeting(@Request() req: any, @Param("id") meetingId: string) {
    return this.doctorService.startMeeting(req.actor.doctor_id, meetingId);
  }

  @Post("patients/:id/link")
  async linkPatient(
    @Request() req: any,
    @Param("id") patientId: string,
    @Body() linkDto: any,
  ) {
    return this.doctorService.linkPatient(req.actor.doctor_id, patientId, linkDto);
  }

  @Delete("patients/:id/link")
  async unlinkPatient(@Request() req: any, @Param("id") patientId: string) {
    return this.doctorService.unlinkPatient(req.actor.doctor_id, patientId);
  }

  @Get("appointments/:id/meeting-status")
  async getAppointmentMeetingStatus(
    @Request() req: any,
    @Param("id") appointmentId: string,
  ) {
    return this.doctorService.getAppointmentMeetingStatus(req.actor.doctor_id, appointmentId);
  }
}
