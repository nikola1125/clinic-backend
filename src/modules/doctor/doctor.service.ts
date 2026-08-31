import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, DataSource, In } from "typeorm";
import { randomUUID } from "crypto";
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
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Consult)
    private consultRepository: Repository<Consult>,
    @InjectRepository(DoctorAvailability)
    private availabilityRepository: Repository<DoctorAvailability>,
    @InjectRepository(MedicalNote)
    private medicalNoteRepository: Repository<MedicalNote>,
    @InjectRepository(Prescription)
    private prescriptionRepository: Repository<Prescription>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ActiveMedication)
    private activeMedicationRepository: Repository<ActiveMedication>,
    @InjectRepository(Diagnosis)
    private diagnosisRepository: Repository<Diagnosis>,
    @InjectRepository(PatientDocument)
    private patientDocumentRepository: Repository<PatientDocument>,
    @InjectRepository(MedicalProfile)
    private medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(DoctorPatientLink)
    private doctorPatientLinkRepository: Repository<DoctorPatientLink>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async getProfile(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
      relations: ["user"],
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return doctor;
  }

  async updateProfile(userId: string, updateProfileDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    Object.assign(doctor, updateProfileDto);
    return this.doctorRepository.save(doctor);
  }

  async getAvailability(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return this.availabilityRepository.find({
      where: { doctorId: doctor.id },
      order: { dayOfWeek: "ASC" },
    });
  }

  async setAvailability(userId: string, availabilityDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const availability = this.availabilityRepository.create({
      ...availabilityDto,
      doctorId: doctor.id,
    });
    return this.availabilityRepository.save(availability);
  }

  async upsertAvailability(userId: string, availabilityDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");

    const rows = Array.isArray(availabilityDto) ? availabilityDto : [availabilityDto];
    // Only delete recurring weekly slots (specificDate IS NULL)
    await this.availabilityRepository
      .createQueryBuilder()
      .delete()
      .where("doctor_id = :doctorId AND specific_date IS NULL", { doctorId: doctor.id })
      .execute();

    const availability = rows.map((row) =>
      this.availabilityRepository.create({
        id: row.id ?? randomUUID(),
        doctorId: doctor.id,
        dayOfWeek: row.day_of_week ?? row.dayOfWeek,
        startTime: row.start_time ?? row.startTime,
        endTime: row.end_time ?? row.endTime,
        slotDurationMin: row.slot_duration_min ?? row.slotDurationMin ?? 30,
        isActive: row.is_active ?? row.isActive ?? true,
        timezone: row.timezone ?? doctor.timezone ?? "UTC",
      }),
    );

    await this.availabilityRepository.save(availability);
    this.notificationsService.emitAvailabilityUpdated(doctor.id);
    return this.getAvailability(doctor.id);
  }

  async getDateAvailability(userId: string, from: string, to: string) {
    const doctor = await this.doctorRepository.findOne({ where: { id: userId } });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return this.availabilityRepository
      .createQueryBuilder("a")
      .where("a.doctor_id = :doctorId", { doctorId: doctor.id })
      .andWhere("a.specific_date IS NOT NULL")
      .andWhere("a.specific_date >= :from", { from })
      .andWhere("a.specific_date <= :to", { to })
      .orderBy("a.specific_date", "ASC")
      .getMany();
  }

  async upsertDateAvailability(userId: string, body: any) {
    const doctor = await this.doctorRepository.findOne({ where: { id: userId } });
    if (!doctor) throw new NotFoundException("Doctor not found");

    const slots: any[] = Array.isArray(body) ? body : body.slots ?? [];

    // Collect all affected dates so we can delete existing records for them first
    const dates: string[] = [...new Set(slots.map((s: any) => s.specific_date ?? s.specificDate))].filter(Boolean) as string[];
    if (dates.length > 0) {
      await this.availabilityRepository
        .createQueryBuilder()
        .delete()
        .where("doctor_id = :doctorId AND specific_date IN (:...dates)", { doctorId: doctor.id, dates })
        .execute();
    }

    // Only save active slots (inactive = day off = just delete)
    const toSave = slots
      .filter((s: any) => s.is_active ?? s.isActive ?? true)
      .map((s: any) =>
        this.availabilityRepository.create({
          id: randomUUID(),
          doctorId: doctor.id,
          dayOfWeek: null,
          specificDate: s.specific_date ?? s.specificDate,
          startTime: s.start_time ?? s.startTime,
          endTime: s.end_time ?? s.endTime,
          slotDurationMin: s.slot_duration_min ?? s.slotDurationMin ?? 30,
          isActive: true,
          timezone: s.timezone ?? doctor.timezone ?? "UTC",
        }),
      );

    if (toSave.length > 0) {
      await this.availabilityRepository.save(toSave);
    }

    this.notificationsService.emitAvailabilityUpdated(doctor.id);
    return this.getDateAvailability(
      userId,
      dates[0] ?? new Date().toISOString().slice(0, 10),
      dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10),
    );
  }


  async getPatients(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");

    // A doctor may only see patients they actually attend: anyone they have an
    // appointment with, plus anyone explicitly linked to them. Never the full
    // patient registry.
    const [appts, links] = await Promise.all([
      this.appointmentRepository.find({
        where: { doctorId: doctor.id },
        select: ["patientId"],
      }),
      this.doctorPatientLinkRepository.find({
        where: { doctorId: doctor.id },
        select: ["patientId"],
      }),
    ]);

    const patientIds = Array.from(
      new Set([
        ...appts.map((a) => a.patientId),
        ...links.map((l) => l.patientId),
      ]),
    );
    if (patientIds.length === 0) return [];

    return this.patientRepository.find({ where: { id: In(patientIds) } });
  }

  async getPatient(userId: string, patientId: string) {
    return this.patientRepository.findOne({
      where: { id: patientId },
      relations: ["user", "medicalProfile"],
    });
  }

  async getAppointments(userId: string, status?: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const where: any = { doctorId: doctor.id };
    if (status) where.status = status;
    return this.appointmentRepository.find({ where, relations: ["patient"] });
  }

  async getAppointment(userId: string, appointmentId: string) {
    return this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: ["patient", "doctor"],
    });
  }

  async updateAppointment(
    userId: string,
    appointmentId: string,
    updateDto: any,
  ) {
    await this.appointmentRepository.update(appointmentId, updateDto);
    return this.appointmentRepository.findOne({ where: { id: appointmentId } });
  }

  async getConsults(userId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return this.consultRepository.find({
      where: { doctorId: doctor.id },
      relations: ["patient"],
    });
  }

  async addNote(userId: string, consultId: string, noteDto: any) {
    const note = this.medicalNoteRepository.create({ ...noteDto, consultId });
    return this.medicalNoteRepository.save(note);
  }

  async createPrescription(userId: string, prescriptionDto: any) {
    const prescription = this.prescriptionRepository.create(prescriptionDto);
    return this.prescriptionRepository.save(prescription);
  }

  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    statusDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");

    const now = new Date();
    const update: any = { status: statusDto.status };
    if (statusDto.status === 'accepted')  update.acceptedAt  = now;
    if (statusDto.status === 'rejected')  update.rejectedAt  = now;
    if (statusDto.status === 'completed') update.completedAt = now;
    await this.appointmentRepository.update(appointmentId, update);

    // Notify the patient's connected clients about the status change
    const patientUser = await this.userRepository.findOne({
      where: { patientId: appointment.patientId },
    });
    if (patientUser) {
      this.notificationsService.emitAppointmentStatusChanged(
        patientUser.id,
        appointmentId,
        statusDto.status,
      );
    }

    // Also notify the doctor's own user room
    const doctorUser = await this.userRepository.findOne({ where: { doctorId: doctor.id } });
    if (doctorUser) {
      this.notificationsService.emitAppointmentStatusChanged(doctorUser.id, appointmentId, statusDto.status);
    }

    return this.appointmentRepository.findOne({ where: { id: appointmentId } });
  }

  async createAppointment(userId: string, appointmentDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const appointment = this.appointmentRepository.create({
      ...appointmentDto,
      doctorId: doctor.id,
    });
    return this.appointmentRepository.save(appointment);
  }

  async getChatMessages(userId: string, appointmentId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    return this.chatMessageRepository.find({
      where: { appointmentId },
      order: { createdAt: "ASC" },
    });
  }

  async sendChatMessage(
    userId: string,
    appointmentId: string,
    messageDto: any,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    const message = this.chatMessageRepository.create({
      ...messageDto,
      appointmentId,
      sender: "doctor",
      createdAt: new Date(),
    });
    return this.chatMessageRepository.save(message);
  }

  async getPatientNotes(userId: string, patientId: string) {
    return this.medicalNoteRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
  }

  async createPatientNote(userId: string, patientId: string, noteDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const note = this.medicalNoteRepository.create({
      ...noteDto,
      patientId,
      doctorId: doctor.id,
    });
    return this.medicalNoteRepository.save(note);
  }

  async updatePatientNote(
    userId: string,
    patientId: string,
    noteId: string,
    noteDto: any,
  ) {
    const note = await this.medicalNoteRepository.findOne({
      where: { id: noteId, patientId },
    });
    if (!note) throw new NotFoundException("Note not found");
    Object.assign(note, noteDto);
    return this.medicalNoteRepository.save(note);
  }

  async deletePatientNote(userId: string, patientId: string, noteId: string) {
    const note = await this.medicalNoteRepository.findOne({
      where: { id: noteId, patientId },
    });
    if (!note) throw new NotFoundException("Note not found");
    await this.medicalNoteRepository.update(noteId, { deletedAt: new Date() });
    return { success: true };
  }

  async getPatientPrescriptions(userId: string, patientId: string) {
    return this.prescriptionRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { issuedAt: "DESC" },
    });
  }

  async createPatientPrescription(
    userId: string,
    patientId: string,
    prescriptionDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const prescription = this.prescriptionRepository.create({
      ...prescriptionDto,
      patientId,
      doctorId: doctor.id,
    });
    return this.prescriptionRepository.save(prescription);
  }

  async updatePrescriptionStatus(
    userId: string,
    patientId: string,
    rxId: string,
    statusDto: any,
  ) {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: rxId, patientId },
    });
    if (!prescription) throw new NotFoundException("Prescription not found");
    await this.prescriptionRepository.update(rxId, {
      status: statusDto.status,
    });
    return this.prescriptionRepository.findOne({ where: { id: rxId } });
  }

  async getPatientMedications(userId: string, patientId: string) {
    return this.activeMedicationRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { startedAt: "DESC" },
    });
  }

  async createPatientMedication(
    userId: string,
    patientId: string,
    medicationDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const medication = this.activeMedicationRepository.create({
      ...medicationDto,
      patientId,
      doctorId: doctor.id,
    });
    return this.activeMedicationRepository.save(medication);
  }

  async updateMedicationStatus(
    userId: string,
    patientId: string,
    medId: string,
    statusDto: any,
  ) {
    const medication = await this.activeMedicationRepository.findOne({
      where: { id: medId, patientId },
    });
    if (!medication) throw new NotFoundException("Medication not found");
    await this.activeMedicationRepository.update(medId, {
      status: statusDto.status,
    });
    return this.activeMedicationRepository.findOne({ where: { id: medId } });
  }

  async getPatientDiagnoses(userId: string, patientId: string) {
    return this.diagnosisRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { diagnosedAt: "DESC" },
    });
  }

  async createPatientDiagnosis(
    userId: string,
    patientId: string,
    diagnosisDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const diagnosis = this.diagnosisRepository.create({
      ...diagnosisDto,
      patientId,
      doctorId: doctor.id,
    });
    return this.diagnosisRepository.save(diagnosis);
  }

  async getPatientDocuments(userId: string, patientId: string) {
    return this.patientDocumentRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { uploadedAt: "DESC" },
    });
  }

  async uploadPatientDocument(
    userId: string,
    patientId: string,
    documentDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const document = this.patientDocumentRepository.create({
      ...documentDto,
      patientId,
      doctorId: doctor.id,
      uploadedBy: "doctor",
    });
    return this.patientDocumentRepository.save(document);
  }

  async getPatientMedicalProfile(userId: string, patientId: string) {
    const profile = await this.medicalProfileRepository.findOne({
      where: { patientId },
    });
    if (!profile) throw new NotFoundException("Medical profile not found");
    return profile;
  }

  async updatePatientMedicalProfile(
    userId: string,
    patientId: string,
    profileDto: any,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const profile = await this.medicalProfileRepository.findOne({
      where: { patientId },
    });
    if (!profile) {
      const newProfile = this.medicalProfileRepository.create({
        ...profileDto,
        patientId,
        updatedByDoctorId: doctor.id,
      });
      return this.medicalProfileRepository.save(newProfile);
    }
    Object.assign(profile, profileDto, { updatedByDoctorId: doctor.id });
    return this.medicalProfileRepository.save(profile);
  }

  async getPatientTimeline(userId: string, patientId: string) {
    const appointments = await this.appointmentRepository.find({
      where: { patientId },
      order: { scheduledAt: "DESC" },
      take: 50,
    });
    const notes = await this.medicalNoteRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
      take: 50,
    });
    const prescriptions = await this.prescriptionRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { issuedAt: "DESC" },
      take: 50,
    });
    const medications = await this.activeMedicationRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { startedAt: "DESC" },
      take: 50,
    });
    const diagnoses = await this.diagnosisRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { diagnosedAt: "DESC" },
      take: 50,
    });
    const documents = await this.patientDocumentRepository.find({
      where: { patientId, deletedAt: IsNull() },
      order: { uploadedAt: "DESC" },
      take: 50,
    });
    const timeline = [
      ...appointments.map((a) => ({
        type: "appointment",
        data: a,
        timestamp: a.scheduledAt,
      })),
      ...notes.map((n) => ({ type: "note", data: n, timestamp: n.createdAt })),
      ...prescriptions.map((p) => ({
        type: "prescription",
        data: p,
        timestamp: p.issuedAt,
      })),
      ...medications.map((m) => ({
        type: "medication",
        data: m,
        timestamp: m.startedAt,
      })),
      ...diagnoses.map((d) => ({
        type: "diagnosis",
        data: d,
        timestamp: d.diagnosedAt,
      })),
      ...documents.map((doc) => ({
        type: "document",
        data: doc,
        timestamp: doc.uploadedAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return timeline;
  }

  async startMeeting(userId: string, meetingId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException("Meeting not found");
    const now = new Date();
    await this.meetingRepository.update(meetingId, {
      status: "active" as any,
      startedAt: now,
      doctorJoinedAt: now,
    });
    return this.meetingRepository.findOne({ where: { id: meetingId } });
  }

  async linkPatient(userId: string, patientId: string, linkDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    return await this.dataSource.transaction(async (manager) => {
      const linkRepo = manager.getRepository(DoctorPatientLink);

      const existingLink = await linkRepo.findOne({
        where: { doctorId: doctor.id, patientId },
      });
      if (existingLink) {
        await linkRepo.update(existingLink.id, {
          status: "active" as any,
        });
        return linkRepo.findOne({
          where: { id: existingLink.id },
        });
      }
      const link = linkRepo.create({
        ...linkDto,
        doctorId: doctor.id,
        patientId,
      });
      return linkRepo.save(link);
    });
  }

  async unlinkPatient(userId: string, patientId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: userId },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const link = await this.doctorPatientLinkRepository.findOne({
      where: { doctorId: doctor.id, patientId },
    });
    if (!link) throw new NotFoundException("Link not found");
    await this.doctorPatientLinkRepository.update(link.id, {
      status: "inactive" as any,
    });
    return { success: true };
  }

  async getAppointmentMeetingStatus(doctorId: string, appointmentId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    const meeting = await this.meetingRepository.findOne({ where: { appointmentId } });
    return {
      appointmentId,
      meetingExists: !!meeting,
      patientJoinedAt: meeting?.patientJoinedAt ?? null,
      doctorJoinedAt: meeting?.doctorJoinedAt ?? null,
      status: meeting?.status ?? null,
    };
  }
}
