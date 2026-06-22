import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  // Emit to a specific user room
  private emitToUser(userId: string, event: string, data: unknown) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to ALL connected clients (e.g. public availability change)
  private broadcast(event: string, data: unknown) {
    if (!this.server) return;
    this.server.emit(event, data);
  }

  // Called when a new appointment is booked — notify the doctor
  emitAppointmentCreated(doctorUserId: string, appointmentId: string) {
    this.emitToUser(doctorUserId, 'appointment:created', { appointmentId });
  }

  // Called when appointment status changes — notify the patient
  emitAppointmentStatusChanged(patientUserId: string, appointmentId: string, status: string) {
    this.emitToUser(patientUserId, 'appointment:status-changed', { appointmentId, status });
  }

  // Called when a doctor updates their availability — broadcast so public pages refresh
  emitAvailabilityUpdated(doctorId: string) {
    this.broadcast('availability:updated', { doctorId });
  }

  // Called when a consult is created/updated/deleted — broadcast
  emitConsultUpdated(doctorId: string) {
    this.broadcast('consult:updated', { doctorId });
  }

  // Admin broadcast message to all connected clients
  broadcastAdminMessage(title: string, message: string, target: string) {
    this.broadcast('admin:broadcast', { title, message, target });
  }
}
