import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { WebsocketService } from "./websocket.service";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment } from "../../entities/appointment.entity";
import { Actor } from "../../common/interfaces/actor.interface";
import * as crypto from "crypto";

interface Room {
  appointmentId: string;
  peers: Map<string, string>; // socketId -> role
  sessionId: string | null;
}

interface SocketData {
  actor: Actor;
  appointmentId: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/meet",
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  // With a namespaced gateway, Nest injects the Namespace — its socket
  // map is `sockets` directly (not `sockets.sockets` like the root Server).
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(WebsocketGateway.name);
  private rooms: Map<string, Room> = new Map();

  constructor(
    private readonly websocketService: WebsocketService,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  private getRoom(appointmentId: string): Room {
    if (!this.rooms.has(appointmentId)) {
      this.rooms.set(appointmentId, {
        appointmentId,
        peers: new Map(),
        sessionId: null,
      });
    }
    return this.rooms.get(appointmentId)!;
  }

  private getSignalingPeers(room: Room): Map<string, string> {
    const signaling = new Map<string, string>();
    for (const [socketId, role] of room.peers.entries()) {
      if (role === "doctor" || role === "patient") {
        signaling.set(socketId, role);
      }
    }
    return signaling;
  }

  private getPeerByRole(room: Room, targetRole: string): string | null {
    for (const [socketId, role] of room.peers.entries()) {
      if (role === targetRole) {
        return socketId;
      }
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const ticket = client.handshake.query.ticket as string;
      const token = client.handshake.query.token as string;
      const appointmentId = client.handshake.query.appointmentId as string;

      if (!ticket && !token) {
        client.disconnect();
        return;
      }

      let actor: Actor | null = null;
      if (ticket) {
        actor = await this.websocketService.verifyTicket(ticket);
      } else if (token) {
        // Legacy fallback - decode token manually if needed
        client.disconnect();
        return;
      }

      if (!actor || !appointmentId) {
        client.disconnect();
        return;
      }

      const appt = await this.appointmentRepo.findOne({
        where: { id: appointmentId, deletedAt: null },
      });

      if (!appt) {
        client.disconnect();
        return;
      }

      const isDoctor =
        actor.role === "doctor" && appt.doctorId === actor.doctor_id;
      const isPatient =
        actor.role === "patient" && appt.patientId === actor.patient_id;
      const isAdmin = actor.role === "admin";

      if (!isDoctor && !isPatient && !isAdmin) {
        client.disconnect();
        return;
      }

      const { ok, reason } = this.websocketService.validateJoinWindow(
        appt,
        actor.role,
      );
      if (!ok) {
        client.emit("error", { message: reason });
        client.disconnect();
        return;
      }

      const role = actor.role;
      client.data = { actor, appointmentId, role } as SocketData;

      const room = this.getRoom(appointmentId);

      // Evict stale same-role socket
      if (role === "doctor" || role === "patient") {
        const staleSocketId = this.getPeerByRole(room, role);
        if (staleSocketId) {
          room.peers.delete(staleSocketId);
          const staleSocket = this.server.sockets.get(staleSocketId);
          if (staleSocket) {
            staleSocket.emit("session-evicted", {
              reason: "Another connection for this role was established",
            });
            staleSocket.disconnect();
          }
        }
      }

      room.peers.set(client.id, role);

      // Tell new peer about existing peers
      for (const [existingSocketId, existingRole] of room.peers.entries()) {
        if (existingSocketId !== client.id) {
          client.emit("peer-joined", { role: existingRole });
        }
      }

      // Notify others
      client.to(appointmentId).emit("peer-joined", { role });
      client.join(appointmentId);

      // If both doctor and patient present, mint fresh session
      const sigPeers = this.getSignalingPeers(room);
      if (sigPeers.size === 2 && (role === "doctor" || role === "patient")) {
        room.sessionId = crypto.randomUUID();
        for (const [socketId] of sigPeers.entries()) {
          const socket = this.server.sockets.get(socketId);
          if (socket) {
            socket.emit("session-ready", {
              session_id: room.sessionId,
              appointment_id: appointmentId,
            });
          }
        }
      }

      this.logger.log(
        `Client ${client.id} connected as ${role} to appointment ${appointmentId}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;
    if (!data || !data.appointmentId) {
      return;
    }

    const { appointmentId, role } = data;
    const room = this.rooms.get(appointmentId);
    if (!room) {
      return;
    }

    room.peers.delete(client.id);

    let endingSession: string | null = null;
    if ((role === "doctor" || role === "patient") && room.sessionId) {
      endingSession = room.sessionId;
      room.sessionId = null;
    }

    if (endingSession) {
      client.to(appointmentId).emit("session-ended", {
        session_id: endingSession,
        role,
      });
    }

    client.to(appointmentId).emit("peer-left", { role });

    if (room.peers.size === 0) {
      this.rooms.delete(appointmentId);
    }

    this.logger.log(
      `Client ${client.id} disconnected from appointment ${appointmentId}`,
    );
  }

  @SubscribeMessage("offer")
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.relaySignaling(client, data, "offer");
  }

  @SubscribeMessage("answer")
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.relaySignaling(client, data, "answer");
  }

  @SubscribeMessage("ice-candidate")
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    this.relaySignaling(client, data, "ice-candidate");
  }

  private relaySignaling(client: Socket, data: any, msgType: string) {
    const socketData = client.data as SocketData;
    if (!socketData || !socketData.appointmentId) {
      return;
    }

    const { appointmentId, role } = socketData;
    const room = this.rooms.get(appointmentId);
    if (!room) {
      return;
    }

    if (role !== "doctor" && role !== "patient") {
      return;
    }

    const msgSession = data.session_id;
    if (msgSession && msgSession !== room.sessionId) {
      return;
    }

    const payload = {
      ...data,
      type: msgType,
      from_role: role,
      session_id: room.sessionId,
    };

    const sigPeers = this.getSignalingPeers(room);
    for (const [socketId] of sigPeers.entries()) {
      if (socketId !== client.id) {
        const socket = this.server.sockets.get(socketId);
        if (socket) {
          socket.emit(msgType, payload);
        }
      }
    }
  }

  @SubscribeMessage("chat")
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const socketData = client.data as SocketData;
    if (!socketData || !socketData.appointmentId) {
      return;
    }

    const { appointmentId, role } = socketData;

    let text =
      typeof data.text === "string" ? data.text.substring(0, 5000) : null;
    let imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : null;

    if (imageUrl && !imageUrl.startsWith("https://")) {
      imageUrl = null;
    } else if (imageUrl) {
      imageUrl = imageUrl.substring(0, 2048);
    }

    if (!text && !imageUrl) {
      return;
    }

    const saved = await this.websocketService.saveChatMessage(
      appointmentId,
      role,
      text || undefined,
      imageUrl || undefined,
    );

    this.server.to(appointmentId).emit("chat", {
      type: "chat",
      from_role: role,
      text,
      imageUrl,
      message: {
        id: saved.id,
        appointment_id: saved.appointmentId,
        sender: saved.sender,
        message: saved.message,
        image_url: saved.imageUrl,
        created_at: saved.createdAt?.toISOString(),
      },
    });
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { type: "pong" });
  }
}
