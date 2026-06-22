import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Appointment, AppointmentStatus } from '../../entities/appointment.entity';
import { Meeting, MeetingStatus } from '../../entities/meeting.entity';
import { Doctor } from '../../entities/doctor.entity';
import { Patient } from '../../entities/patient.entity';
import { ChatMessage, ChatSender } from '../../entities/chat-message.entity';
import { Actor, UserRole } from '../../common/interfaces/actor.interface';
import { RedisService } from '../../common/services/redis.service';
import { SecurityService } from '../../common/services/security.service';
import * as crypto from 'crypto';

const WS_TICKET_PREFIX = 'ws_ticket:';
const WS_TICKET_TTL = 60; // seconds

export interface TurnCredentials {
  username: string;
  password: string;
  ttl: number;
  uris: string[];
  realm: string;
}

export interface MeetContext {
  role: string;
  appointment: Appointment | Record<string, unknown>;
  doctor_name: string;
  patient_full_name: string;
  meeting: Meeting | null;
}

@Injectable()
export class WebsocketService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(Meeting)
    private meetingRepo: Repository<Meeting>,
    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    private configService: ConfigService,
    private redisService: RedisService,
    private securityService: SecurityService,
  ) {}

  async generateTicket(actor: Actor): Promise<{ ticket: string; ttl: number }> {
    const ticket = crypto.randomBytes(32).toString('base64url');
    const key = `${WS_TICKET_PREFIX}${ticket}`;

    await this.redisService.set(
      key,
      JSON.stringify({
        sub: actor.sub,
        role: actor.role,
        doctor_id: actor.doctor_id,
        patient_id: actor.patient_id,
      }),
      WS_TICKET_TTL,
    );

    return { ticket, ttl: WS_TICKET_TTL };
  }

  async verifyTicket(ticket: string): Promise<Actor | null> {
    const key = `${WS_TICKET_PREFIX}${ticket}`;
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    await this.redisService.del(key); // single-use

    const claims = JSON.parse(data);
    return {
      sub: claims.sub,
      role: claims.role as UserRole,
      doctor_id: claims.doctor_id,
      patient_id: claims.patient_id,
    };
  }

  async getMeetContext(appointmentId: string, actor: Actor): Promise<MeetContext> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, deletedAt: null },
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = actor.role === UserRole.DOCTOR && appt.doctorId === actor.doctor_id;
    const isPatient = actor.role === UserRole.PATIENT && appt.patientId === actor.patient_id;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('Not a participant in this appointment');
    }

    const role = isDoctor ? 'doctor' : 'patient';

    const { ok, reason } = this.validateJoinWindow(appt, actor.role);
    if (!ok) {
      throw new ForbiddenException(reason);
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: appt.doctorId } });
    const patient = await this.patientRepo.findOne({ where: { id: appt.patientId } });
    const meeting = await this.meetingRepo.findOne({ where: { appointmentId } });

    return {
      role,
      appointment: {
        id: appt.id,
        doctor_id: appt.doctorId,
        patient_id: appt.patientId,
        consult_id: appt.consultId,
        scheduled_at: appt.scheduledAt,
        status: appt.status,
        price_cents: appt.priceCents,
      },
      doctor_name: doctor?.name || 'Doctor',
      patient_full_name: patient?.fullName || 'Patient',
      meeting,
    };
  }

  validateJoinWindow(appt: Appointment, actorRole: UserRole): { ok: boolean; reason: string } {
    if (actorRole === UserRole.ADMIN) {
      return { ok: true, reason: '' };
    }

    if (appt.status === AppointmentStatus.REJECTED || appt.status === AppointmentStatus.COMPLETED) {
      return { ok: false, reason: `Appointment is ${appt.status}` };
    }

    if (!appt.scheduledAt) {
      return { ok: false, reason: 'Appointment has no scheduled time' };
    }

    const skipCheck = this.configService.get<string>('MEETING_SKIP_JOIN_WINDOW_CHECK') === 'true';
    if (skipCheck) {
      return { ok: true, reason: '' };
    }

    const now = new Date();
    const scheduledAt = new Date(appt.scheduledAt);
    const beforeMinutes = parseInt(this.configService.get<string>('MEETING_JOIN_WINDOW_BEFORE_MINUTES') || '15', 10);
    const afterMinutes = parseInt(this.configService.get<string>('MEETING_JOIN_WINDOW_AFTER_MINUTES') || '120', 10);

    const earliest = new Date(scheduledAt.getTime() - beforeMinutes * 60 * 1000);
    const latest = new Date(scheduledAt.getTime() + afterMinutes * 60 * 1000);

    // Allow participants to open the waiting room before the scheduled time.
    if (now < earliest) return { ok: true, reason: '' };
    if (now > latest) {
      return { ok: false, reason: 'Meeting window has closed' };
    }

    return { ok: true, reason: '' };
  }

  async joinMeeting(appointmentId: string, actor: Actor): Promise<Meeting> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, deletedAt: null },
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = actor.role === UserRole.DOCTOR && appt.doctorId === actor.doctor_id;
    const isPatient = actor.role === UserRole.PATIENT && appt.patientId === actor.patient_id;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('Not a participant in this appointment');
    }

    let meeting = await this.meetingRepo.findOne({ where: { appointmentId } });
    if (!meeting) {
      meeting = this.meetingRepo.create({
        appointmentId,
        status: MeetingStatus.WAITING,
      });
    }

    const now = new Date();
    if (isDoctor && !meeting.doctorJoinedAt) {
      meeting.doctorJoinedAt = now;
      // Stamp the appointment so the timestamp is visible on the appointment record
      await this.appointmentRepo.update(appointmentId, { joinedCallAt: now });
    }
    if (isPatient && !meeting.patientJoinedAt) {
      meeting.patientJoinedAt = now;
    }

    if (meeting.doctorJoinedAt && meeting.patientJoinedAt && meeting.status === MeetingStatus.WAITING) {
      meeting.status = MeetingStatus.ACTIVE;
      if (!meeting.startedAt) {
        meeting.startedAt = now;
      }
    }

    await this.meetingRepo.save(meeting);
    return meeting;
  }

  async endMeeting(appointmentId: string, actor: Actor): Promise<Meeting> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, deletedAt: null },
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = actor.role === UserRole.DOCTOR && appt.doctorId === actor.doctor_id;
    const isPatient = actor.role === UserRole.PATIENT && appt.patientId === actor.patient_id;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('Not a participant in this appointment');
    }

    const meeting = await this.meetingRepo.findOne({ where: { appointmentId } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    meeting.status = MeetingStatus.ENDED;
    meeting.endedAt = new Date();

    await this.meetingRepo.save(meeting);
    return meeting;
  }

  async getTurnCredentials(actor: Actor): Promise<TurnCredentials> {
    const mode = (this.configService.get<string>('TURN_MODE') || 'hmac').toLowerCase();

    if (mode === 'metered') {
      return this.getMeteredTurnCredentials();
    }

    if (mode === 'static') {
      return this.getStaticTurnCredentials();
    }

    return this.getHmacTurnCredentials(actor);
  }

  private async getMeteredTurnCredentials(): Promise<TurnCredentials> {
    const apiKey = this.configService.get<string>('TURN_METERED_SECRET_KEY');
    const domain = this.configService.get<string>('TURN_METERED_DOMAIN');

    if (!apiKey || !domain) {
      throw new Error('TURN_METERED_SECRET_KEY / TURN_METERED_DOMAIN not set');
    }

    try {
      const response = await fetch(
        `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const iceServers = await response.json();
      const uris: string[] = [];
      let username = '';
      let credential = '';

      for (const server of iceServers) {
        const urls = server.urls;
        if (urls) {
          if (Array.isArray(urls)) {
            uris.push(...urls);
          } else {
            uris.push(urls);
          }
        }
        if (!username && server.username) {
          username = server.username;
          credential = server.credential || '';
        }
      }

      const ttl = parseInt(this.configService.get<string>('TURN_TTL_SECONDS') || '86400', 10);
      return { username, password: credential, ttl, uris, realm: domain };
    } catch (error) {
      // Fallback to STUN-only
      return {
        username: '',
        password: '',
        ttl: 0,
        uris: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
        realm: '',
      };
    }
  }

  private getStaticTurnCredentials(): TurnCredentials {
    const username = this.configService.get<string>('TURN_STATIC_USERNAME');
    const password = this.configService.get<string>('TURN_STATIC_PASSWORD');
    const urisStr = this.configService.get<string>('TURN_STATIC_URIS');

    if (!username || !password || !urisStr) {
      throw new Error('TURN static credentials are not configured on the server');
    }

    const uris = urisStr.split(',').map(u => u.trim()).filter(u => u);
    const ttl = parseInt(this.configService.get<string>('TURN_TTL_SECONDS') || '86400', 10);
    const realm = this.configService.get<string>('TURN_REALM') || '';

    return { username, password, ttl, uris, realm };
  }

  private getHmacTurnCredentials(actor: Actor): TurnCredentials {
    const secret = this.configService.get<string>('TURN_SECRET');
    if (!secret) {
      throw new Error('TURN_SECRET is not configured (required for hmac TURN mode)');
    }

    const ttl = parseInt(this.configService.get<string>('TURN_TTL_SECONDS') || '86400', 10);
    const expiry = Math.floor(Date.now() / 1000) + ttl;
    const userTag = (actor.sub || 'anon').substring(0, 32);
    const username = `${expiry}:${userTag}:${crypto.randomBytes(4).toString('hex')}`;

    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(username);
    const password = hmac.digest('base64');

    const host = this.configService.get<string>('TURN_HOST') || 'localhost';
    const port = this.configService.get<string>('TURN_PORT') || '3478';
    const tlsPort = this.configService.get<string>('TURN_TLS_PORT') || '5349';
    const tlsEnabled = this.configService.get<string>('TURN_TLS_ENABLED') === 'true';

    const uris = [
      `turn:${host}:${port}?transport=udp`,
      `turn:${host}:${port}?transport=tcp`,
    ];

    if (tlsEnabled) {
      uris.push(`turns:${host}:${tlsPort}?transport=tcp`);
    }

    const realm = this.configService.get<string>('TURN_REALM') || '';
    return { username, password, ttl, uris, realm };
  }

  async saveChatMessage(
    appointmentId: string,
    sender: string,
    text?: string,
    imageUrl?: string,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepo.create({
      appointmentId,
      sender: sender as ChatSender,
      message: text || '',
      imageUrl: imageUrl || null,
      createdAt: new Date(),
    });

    await this.chatMessageRepo.save(message);
    return message;
  }
}
