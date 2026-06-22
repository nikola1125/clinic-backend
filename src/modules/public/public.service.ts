import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import {
  Doctor,
  Consult,
  DoctorAvailability,
  Appointment,
  Patient,
  DoctorPatientLink,
  AppointmentStatus,
  LinkStatus,
} from "../../entities";
import { User } from "../../entities/user.entity";
import { AppointmentCreateDto } from "../../common/dto/appointment.dto";
import { PatientCreateDto } from "../../common/dto/patient.dto";
import { Actor } from "../../common/interfaces/actor.interface";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Consult) private consultRepo: Repository<Consult>,
    @InjectRepository(DoctorAvailability)
    private availRepo: Repository<DoctorAvailability>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(DoctorPatientLink)
    private linkRepo: Repository<DoctorPatientLink>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async listDoctors() {
    const doctors = await this.doctorRepo.find({
      where: { deletedAt: null as any },
    });
    return doctors.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      bio: d.bio,
    }));
  }

  async getDoctorAvailability(doctorId: string) {
    return this.availRepo.find({
      where: { doctorId },
      order: { dayOfWeek: "ASC" },
    });
  }

  async getDoctorAvailabilityDates(doctorId: string, from: string, to: string) {
    return this.availRepo
      .createQueryBuilder("a")
      .where("a.doctor_id = :doctorId", { doctorId })
      .andWhere("a.specific_date IS NOT NULL")
      .andWhere("a.specific_date >= :from", { from })
      .andWhere("a.specific_date <= :to", { to })
      .orderBy("a.specific_date", "ASC")
      .getMany();
  }

  async getDoctorConsults(doctorId: string) {
    return this.consultRepo.find({ where: { doctorId } });
  }

  async bookAppointment(payload: AppointmentCreateDto, actor: Actor) {
    if (payload.patient_id !== actor.patient_id) {
      throw new ForbiddenException(
        "Cannot book appointment for another patient",
      );
    }

    const consult = await this.consultRepo.findOne({
      where: { id: payload.consult_id },
    });
    if (!consult) {
      throw new NotFoundException("Consult not found");
    }

    const patient = await this.patientRepo.findOne({
      where: { id: payload.patient_id, deletedAt: null as any },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const conflict = await this.appointmentRepo.findOne({
      where: {
        doctorId: payload.doctor_id,
        scheduledAt: new Date(payload.scheduled_at),
        status: In([AppointmentStatus.PENDING, AppointmentStatus.ACCEPTED]),
        deletedAt: null as any,
      },
    });
    if (conflict) {
      throw new ConflictException(
        "This time slot is already booked. Please choose a different time.",
      );
    }

    const appt = this.appointmentRepo.create({
      doctorId: payload.doctor_id,
      patientId: payload.patient_id,
      consultId: payload.consult_id,
      scheduledAt: new Date(payload.scheduled_at),
      status: AppointmentStatus.PENDING,
      priceCents: consult.priceCents,
    });

    try {
      await this.appointmentRepo.save(appt);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException(
          "This time slot is already booked. Please choose a different time.",
        );
      }
      throw error;
    }

    // Notify the doctor's connected clients about the new appointment
    const doctorUser = await this.userRepo.findOne({
      where: { doctorId: payload.doctor_id },
    });
    if (doctorUser) {
      this.notificationsService.emitAppointmentCreated(doctorUser.id, appt.id);
    }

    return appt;
  }

  async createPatient(payload: PatientCreateDto, actor: Actor) {
    if (payload.doctor_id) {
      const doctor = await this.doctorRepo.findOne({
        where: { id: payload.doctor_id },
      });
      if (!doctor) {
        throw new NotFoundException("Doctor not found");
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const patientRepo = manager.getRepository(Patient);
      const linkRepo = manager.getRepository(DoctorPatientLink);

      const patient = patientRepo.create({
        fullName: payload.full_name,
        email: payload.email,
        phone: payload.phone,
      });

      await patientRepo.save(patient);

      if (payload.doctor_id) {
        const existingLink = await linkRepo.findOne({
          where: {
            doctorId: payload.doctor_id,
            patientId: patient.id,
          },
        });

        if (!existingLink) {
          const link = linkRepo.create({
            doctorId: payload.doctor_id,
            patientId: patient.id,
            isPrimary: true,
            status: LinkStatus.ACTIVE,
          });
          await linkRepo.save(link);
        }
      }

      return patient;
    });
  }
}
