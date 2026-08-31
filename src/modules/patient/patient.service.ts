import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
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
  ChatSender,
  User,
} from "../../entities";

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment) private apptRepo: Repository<Appointment>,
    @InjectRepository(MedicalProfile)
    private profileRepo: Repository<MedicalProfile>,
    @InjectRepository(MedicalNote) private noteRepo: Repository<MedicalNote>,
    @InjectRepository(Prescription) private rxRepo: Repository<Prescription>,
    @InjectRepository(Diagnosis) private diagRepo: Repository<Diagnosis>,
    @InjectRepository(PatientDocument)
    private docRepo: Repository<PatientDocument>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(ChatMessage) private chatRepo: Repository<ChatMessage>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getMe(patientId: string) {
    return this.patientRepo.findOne({ where: { id: patientId } });
  }

  async updateMe(
    patientId: string,
    dto: { full_name?: string; phone?: string },
  ) {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException("Patient not found");
    if (dto.full_name !== undefined) patient.fullName = dto.full_name;
    if (dto.phone !== undefined) patient.phone = dto.phone || null;
    await this.patientRepo.save(patient);
    return patient;
  }

  async getAppointments(patientId: string) {
    return this.apptRepo.find({
      where: { patientId },
      order: { scheduledAt: "ASC" },
    });
  }

  async getAppointment(appointmentId: string, patientId: string) {
    const appt = await this.apptRepo.findOne({
      where: { id: appointmentId, patientId, deletedAt: IsNull() },
    });
    if (!appt) throw new NotFoundException("Appointment not found");
    return appt;
  }

  async getChat(appointmentId: string, patientId: string) {
    const appt = await this.apptRepo.findOne({
      where: { id: appointmentId, patientId, deletedAt: IsNull() },
    });
    if (!appt) throw new NotFoundException("Appointment not found");
    return this.chatRepo.find({
      where: { appointmentId },
      order: { createdAt: "ASC" },
    });
  }

  async sendChat(appointmentId: string, patientId: string, payload: any) {
    const appt = await this.apptRepo.findOne({
      where: { id: appointmentId, patientId, deletedAt: IsNull() },
    });
    if (!appt) throw new NotFoundException("Appointment not found");
    const msg = this.chatRepo.create({
      appointmentId,
      sender: ChatSender.PATIENT,
      message: payload.message,
      imageUrl: payload.image_url,
      createdAt: new Date(),
    });
    await this.chatRepo.save(msg);
    return msg;
  }

  async getMedicalProfile(patientId: string) {
    return this.profileRepo.findOne({ where: { patientId } });
  }

  async getNotes(patientId: string) {
    return this.noteRepo.find({ where: { patientId, isPrivate: false } });
  }

  async getPrescriptions(patientId: string) {
    return this.rxRepo.find({ where: { patientId } });
  }

  async getDiagnoses(patientId: string) {
    return this.diagRepo.find({ where: { patientId } });
  }

  async getDocuments(patientId: string) {
    return this.docRepo.find({ where: { patientId } });
  }

  async getNotifications(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const notif = await this.notifRepo.findOne({
      where: { id: notificationId, userId: user.id },
    });
    if (!notif) throw new NotFoundException("Notification not found");
    notif.read = true;
    await this.notifRepo.save(notif);
    return notif;
  }
}
