import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, DataSource } from "typeorm";
import { Doctor } from "../../entities/doctor.entity";
import { Patient } from "../../entities/patient.entity";
import { Consult } from "../../entities/consult.entity";
import { Appointment } from "../../entities/appointment.entity";
import { User, UserRole } from "../../entities/user.entity";
import { DoctorApplication } from "../../entities/doctor-application.entity";
import { Notification, NotificationType } from "../../entities/notification.entity";
import { MedicalNote } from "../../entities/medical-note.entity";
import { MedicalProfile } from "../../entities/medical-profile.entity";
import { Prescription } from "../../entities/prescription.entity";
import { ActiveMedication } from "../../entities/active-medication.entity";
import { Diagnosis } from "../../entities/diagnosis.entity";
import { PatientDocument } from "../../entities/patient-document.entity";
import { RlsService } from "../../common/services/rls.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Consult)
    private consultRepository: Repository<Consult>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DoctorApplication)
    private doctorAppRepo: Repository<DoctorApplication>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(MedicalNote)
    private medicalNoteRepository: Repository<MedicalNote>,
    @InjectRepository(MedicalProfile)
    private medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(Prescription)
    private prescriptionRepository: Repository<Prescription>,
    @InjectRepository(ActiveMedication)
    private activeMedicationRepository: Repository<ActiveMedication>,
    @InjectRepository(Diagnosis)
    private diagnosisRepository: Repository<Diagnosis>,
    @InjectRepository(PatientDocument)
    private patientDocumentRepository: Repository<PatientDocument>,
    private rlsService: RlsService,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async listDoctors() {
    return this.doctorRepository.manager.transaction(async (em) => {
      await this.rlsService.setAdminContext(em);
      return em.find(Doctor, {
        where: { deletedAt: IsNull() },
        relations: ["user"],
      });
    });
  }

  async createDoctor(createDoctorDto: any) {
    return await this.dataSource.transaction(async (manager) => {
      const doctorRepo = manager.getRepository(Doctor);
      const userRepo = manager.getRepository(User);

      const doctor = doctorRepo.create(createDoctorDto as any);
      const savedDoctor = await doctorRepo.save(doctor as any);

      if (createDoctorDto.email && createDoctorDto.password) {
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(createDoctorDto.password, 10);
        const user = userRepo.create({
          email: createDoctorDto.email,
          username: createDoctorDto.username || null,
          hashedPw: hashedPassword,
          role: UserRole.DOCTOR,
          doctorId: savedDoctor.id,
        });
        await userRepo.save(user);
      }

      return doctorRepo.findOne({ where: { id: savedDoctor.id }, relations: ["user"] });
    });
  }

  async updateDoctor(id: string, updateDoctorDto: any) {
    // Separate doctor fields from user/auth fields
    const { username, password, email, ...doctorFields } = updateDoctorDto;

    // Update doctor-specific columns (name, specialty, bio, etc.)
    const doctorUpdate: Record<string, any> = { ...doctorFields };
    if (email) doctorUpdate.email = email;

    if (Object.keys(doctorUpdate).length > 0) {
      await this.doctorRepository.update(id, doctorUpdate);
    }

    // Update the linked user record (email, username, password)
    const user = await this.userRepository.findOne({ where: { doctorId: id } });
    if (user) {
      const userUpdate: Record<string, any> = {};
      if (email) userUpdate.email = email;
      if (username) userUpdate.username = username;
      if (password && password.length >= 8) {
        const bcrypt = await import('bcrypt');
        userUpdate.hashedPw = await bcrypt.hash(password, 10);
      }
      if (Object.keys(userUpdate).length > 0) {
        await this.userRepository.update(user.id, userUpdate);
      }
    }

    return this.doctorRepository.findOne({ where: { id }, relations: ["user"] });
  }

  async deleteDoctor(id: string) {
    await this.doctorRepository.update(id, { deletedAt: new Date() });
    return { message: "Doctor deleted successfully" };
  }

  async createDoctorConsult(doctorId: string, createConsultDto: any) {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId, deletedAt: IsNull() },
    });
    if (!doctor) {
      throw new NotFoundException("Doctor not found");
    }
    const { price_cents, priceCents, ...rest } = createConsultDto;
    const consult = this.consultRepository.create({
      ...rest,
      priceCents: priceCents ?? price_cents,
      doctorId,
    });
    const saved = await this.consultRepository.save(consult);
    this.notificationsService.emitConsultUpdated(doctorId);
    return saved;
  }

  async listDoctorConsults(doctorId: string) {
    return this.consultRepository.find({
      where: { doctorId },
    });
  }

  async listPatients() {
    return this.patientRepository.find({
      where: { deletedAt: IsNull() },
    });
  }

  async deletePatient(id: string) {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.patientRepository.update(id, { deletedAt: new Date() });
    // also deactivate the user account
    const user = await this.userRepository.findOne({ where: { patientId: id } });
    if (user) await this.userRepository.update(user.id, { isActive: false });
    return { message: 'Patient removed successfully' };
  }

  async listConsults() {
    return this.consultRepository.find({
      relations: ["doctor", "patient"],
    });
  }

  async createConsult(createConsultDto: any) {
    const { price_cents, priceCents, ...rest } = createConsultDto;
    const consult: Consult = this.consultRepository.create({
      ...rest,
      priceCents: priceCents ?? price_cents,
    } as Partial<Consult>);
    const saved = await this.consultRepository.save(consult);
    if (consult.doctorId) {
      this.notificationsService.emitConsultUpdated(consult.doctorId);
    }
    return saved;
  }

  async updateConsult(id: string, updateConsultDto: any) {
    const consult = await this.consultRepository.findOne({ where: { id } });
    if (!consult) {
      throw new NotFoundException("Consult not found");
    }
    const { price_cents, priceCents, ...rest } = updateConsultDto;
    Object.assign(consult, {
      ...rest,
      priceCents: priceCents ?? price_cents,
    });
    const saved = await this.consultRepository.save(consult);
    if (consult.doctorId) {
      this.notificationsService.emitConsultUpdated(consult.doctorId);
    }
    return saved;
  }

  async deleteConsult(id: string) {
    const consult = await this.consultRepository.findOne({ where: { id } });
    if (!consult) {
      throw new NotFoundException("Consult not found");
    }
    const { doctorId } = consult;
    await this.consultRepository.remove(consult);
    if (doctorId) {
      this.notificationsService.emitConsultUpdated(doctorId);
    }
    return { message: "Consult deleted successfully" };
  }

  async getDoctorSchedule(doctorId: string, from: string, to: string) {
    const doctor = await this.doctorRepository.findOne({ where: { id: doctorId, deletedAt: IsNull() } });
    if (!doctor) throw new NotFoundException("Doctor not found");
    const { DoctorAvailability } = await import("../../entities/doctor-availability.entity");
    return this.doctorRepository.manager
      .createQueryBuilder(DoctorAvailability, "a")
      .where("a.doctor_id = :doctorId", { doctorId })
      .andWhere("a.specific_date IS NOT NULL")
      .andWhere("a.specific_date >= :from", { from })
      .andWhere("a.specific_date <= :to", { to })
      .orderBy("a.specific_date", "ASC")
      .getMany();
  }

  async listAppointments() {
    return this.appointmentRepository.find({
      relations: ["doctor", "patient"],
    });
  }

  async updateAppointmentStatus(id: string, status: string) {
    const appt = await this.appointmentRepository.findOne({ where: { id } });
    if (!appt) throw new NotFoundException("Appointment not found");

    const now = new Date();
    const update: any = { status: status as any };
    if (status === 'accepted')  update.acceptedAt  = now;
    if (status === 'rejected')  update.rejectedAt  = now;
    if (status === 'completed') update.completedAt = now;
    await this.appointmentRepository.update(id, update);

    // Notify patient
    const patientUser = await this.userRepository.findOne({ where: { patientId: appt.patientId } });
    if (patientUser) {
      this.notificationsService.emitAppointmentStatusChanged(patientUser.id, id, status);
    }

    // Notify doctor
    const doctorUser = await this.userRepository.findOne({ where: { doctorId: appt.doctorId } });
    if (doctorUser) {
      this.notificationsService.emitAppointmentStatusChanged(doctorUser.id, id, status);
    }

    return this.appointmentRepository.findOne({ where: { id } });
  }

  async getRevenue(
    year?: number,
    month?: number,
    day?: number,
    doctorId?: string,
  ) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder("appointment")
      .where("appointment.status = :status", { status: "completed" })
      .andWhere("appointment.deletedAt IS NULL");

    if (year) {
      queryBuilder.andWhere(
        "EXTRACT(YEAR FROM appointment.scheduledAt) = :year",
        { year },
      );
    }
    if (month) {
      queryBuilder.andWhere(
        "EXTRACT(MONTH FROM appointment.scheduledAt) = :month",
        { month },
      );
    }
    if (day) {
      queryBuilder.andWhere(
        "EXTRACT(DAY FROM appointment.scheduledAt) = :day",
        { day },
      );
    }
    if (doctorId) {
      queryBuilder.andWhere("appointment.doctorId = :doctorId", { doctorId });
    }

    const appointments = await queryBuilder.getMany();
    const totalCents = appointments.reduce(
      (sum, a) => sum + (a.priceCents || 0),
      0,
    );
    const totalUsd = totalCents / 100.0;

    return {
      total_usd: totalUsd,
      year,
      month,
      day,
      doctor_id: doctorId,
    };
  }

  async getStats() {
    const [doctorCount, patientCount, consultCount, appointmentCount] =
      await Promise.all([
        this.doctorRepository.count({ where: { deletedAt: IsNull() } }),
        this.patientRepository.count({ where: { deletedAt: IsNull() } }),
        this.consultRepository.count(),
        this.appointmentRepository.count(),
      ]);

    return {
      doctors: doctorCount,
      patients: patientCount,
      consults: consultCount,
      appointments: appointmentCount,
    };
  }

  async listDoctorApplications() {
    return this.doctorAppRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateDoctorApplicationStatus(id: string, status: string, note?: string) {
    const app = await this.doctorAppRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    app.status = status as any;
    return this.doctorAppRepo.save(app);
  }

  async deleteDoctorApplication(id: string) {
    await this.doctorAppRepo.delete(id);
    return { deleted: true };
  }

  async broadcastNotification(title: string, message: string, target: 'all' | 'doctors' | 'patients') {
    this.notificationsService.broadcastAdminMessage(title, message, target);
    const users = await this.userRepository.find();
    const filtered = users.filter(u => {
      if (target === 'all') return true;
      if (target === 'doctors') return u.role === 'doctor';
      if (target === 'patients') return u.role === 'patient';
      return false;
    });
    const notifications = filtered.map(u =>
      this.notificationRepository.create({
        userId: u.id,
        title,
        body: message,
        type: NotificationType.MESSAGE_RECEIVED,
      })
    );
    await this.notificationRepository.save(notifications);
    return { sent: filtered.length };
  }

  async getPatientById(id: string) {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    const user = await this.userRepository.findOne({ where: { patientId: id } });
    return { ...patient, isActive: user?.isActive ?? true };
  }

  async updatePatient(id: string, patch: { fullName?: string; email?: string; phone?: string }) {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patch.fullName !== undefined) patient.fullName = patch.fullName;
    if (patch.email !== undefined) patient.email = patch.email;
    if (patch.phone !== undefined) patient.phone = patch.phone || null;
    const saved = await this.patientRepository.save(patient);
    // sync email on user account too
    if (patch.email !== undefined) {
      const user = await this.userRepository.findOne({ where: { patientId: id } });
      if (user) await this.userRepository.update(user.id, { email: patch.email });
    }
    return saved;
  }

  async getPatientNotes(patientId: string) {
    return this.medicalNoteRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPatientMedicalProfile(patientId: string) {
    return this.medicalProfileRepository.findOne({ where: { patientId } });
  }

  async getPatientPrescriptions(patientId: string) {
    return this.prescriptionRepository.find({
      where: { patientId },
      order: { issuedAt: 'DESC' },
    });
  }

  async getPatientMedications(patientId: string) {
    return this.activeMedicationRepository.find({
      where: { patientId },
      order: { startedAt: 'DESC' },
    });
  }

  async getPatientDiagnoses(patientId: string) {
    return this.diagnosisRepository.find({
      where: { patientId },
      order: { diagnosedAt: 'DESC' },
    });
  }

  async getPatientDocuments(patientId: string) {
    return this.patientDocumentRepository.find({
      where: { patientId },
      order: { uploadedAt: 'DESC' },
    });
  }
}
